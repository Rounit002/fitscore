#!/usr/bin/env node
/**
 * Verifies real API traffic from inside the running Cordova WebView.
 *
 * Requires:
 *   - the app running on a device/emulator
 *   - `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`
 *   - a backend reachable from the device (e.g. `adb reverse tcp:5000 tcp:5000`)
 *
 * Unlike verify-device.js (which checks the shell/bridge), this drives an
 * actual register -> authenticated-read round trip through the WebView's own
 * fetch stack, so CORS, the Bearer replay and the fetch patch are all exercised
 * exactly as they are in the shipped app.
 */

const http = require('node:http');
const crypto = require('node:crypto');

const PORT = Number(process.argv[2] || 9333);
const API = process.argv[3] || 'http://localhost:5000';

const getJSON = (path) =>
  new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`Bad JSON from ${path}`));
          }
        });
      })
      .on('error', reject);
  });

class CDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
  }

  connect() {
    return new Promise((resolve, reject) => {
      const url = new URL(this.wsUrl);
      const req = http.request({
        host: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
          'Sec-WebSocket-Version': '13',
        },
      });
      req.on('upgrade', (_res, socket) => {
        this.socket = socket;
        socket.on('data', (c) => this.onData(c));
        socket.on('error', reject);
        resolve();
      });
      req.on('error', reject);
      req.end();
    });
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      if (this.buffer.length < 2) return;
      const len0 = this.buffer[1] & 0x7f;
      let offset = 2;
      let length = len0;
      if (len0 === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (len0 === 127) {
        if (this.buffer.length < 10) return;
        length = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }
      if (this.buffer.length < offset + length) return;
      const payload = this.buffer.subarray(offset, offset + length).toString('utf8');
      this.buffer = this.buffer.subarray(offset + length);
      try {
        const msg = JSON.parse(payload);
        const resolver = this.pending.get(msg.id);
        if (resolver) {
          this.pending.delete(msg.id);
          resolver(msg);
        }
      } catch {
        /* ignore */
      }
    }
  }

  send(method, params = {}) {
    const id = ++this.id;
    const data = Buffer.from(JSON.stringify({ id, method, params }), 'utf8');
    const mask = crypto.randomBytes(4);
    const header = [0x81];
    if (data.length < 126) header.push(0x80 | data.length);
    else if (data.length < 65536) header.push(0x80 | 126, data.length >> 8, data.length & 0xff);
    else throw new Error('payload too large');
    const masked = Buffer.from(data.map((b, i) => b ^ mask[i % 4]));
    this.socket.write(Buffer.concat([Buffer.from(header), mask, masked]));
    return new Promise((resolve, reject) => {
      this.pending.set(id, resolve);
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`timeout: ${method}`));
      }, 120000);
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.result?.exceptionDetails) {
      throw new Error(res.result.exceptionDetails.exception?.description || 'eval failed');
    }
    return res.result?.result?.value;
  }

  close() {
    this.socket?.destroy();
  }
}

const results = [];
const check = (name, pass, detail) => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  const targets = await getJSON('/json/list');
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('No page target; is the app running?');

  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Runtime.enable');

  const email = `webview-${Date.now()}@example.com`;

  // Full round trip driven by the WebView's own fetch.
  const script = `(async () => {
    const API = ${JSON.stringify(API)};
    const out = {};
    try {
      const reg = await fetch(API + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' },
        body: JSON.stringify({ email: ${JSON.stringify(email)}, password: 'TestPass123!', name: 'WebView Verify' }),
      });
      out.registerStatus = reg.status;
      const data = await reg.json();
      out.hasToken = typeof data.token === 'string';
      out.token = data.token || null;
    } catch (e) { out.registerError = String(e); return JSON.stringify(out); }

    try {
      const me = await fetch(API + '/auth/me', {
        headers: { 'X-Client': 'mobile', Authorization: 'Bearer ' + out.token },
      });
      out.meStatus = me.status;
    } catch (e) { out.meError = String(e); }

    try {
      const anon = await fetch(API + '/auth/me', { headers: { 'X-Client': 'mobile' } });
      out.anonStatus = anon.status;
    } catch (e) { out.anonError = String(e); }

    try {
      const scans = await fetch(API + '/scans', {
        headers: { 'X-Client': 'mobile', Authorization: 'Bearer ' + out.token },
      });
      out.scansStatus = scans.status;
    } catch (e) { out.scansError = String(e); }

    return JSON.stringify(out);
  })()`;

  const r = JSON.parse(await cdp.evaluate(script));

  check(
    'WebView reaches API (CORS preflight ok)',
    r.registerStatus === 200,
    r.registerError || `POST /auth/register status=${r.registerStatus}`,
  );
  check('Mobile register returns JWT to WebView', r.hasToken === true, `hasToken=${r.hasToken}`);
  check('Bearer auth works from WebView', r.meStatus === 200, r.meError || `GET /auth/me status=${r.meStatus}`);
  check('Unauthenticated request rejected', r.anonStatus === 401, r.anonError || `status=${r.anonStatus}`);
  check('Data route works from WebView', r.scansStatus === 200, r.scansError || `GET /scans status=${r.scansStatus}`);

  // localStorage token persistence (how the app replays auth across launches).
  const store = await cdp.evaluate(
    `(() => { try { localStorage.setItem('nutriscan_token','probe'); const v = localStorage.getItem('nutriscan_token'); localStorage.removeItem('nutriscan_token'); return v; } catch (e) { return 'ERR:' + e; } })()`,
  );
  check('localStorage available for token persistence', store === 'probe', `value=${store}`);

  cdp.close();

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('verify-api-in-webview failed:', err.message);
  process.exitCode = 1;
});

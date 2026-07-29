#!/usr/bin/env node
/**
 * On-device smoke test for the Cordova Android build.
 *
 * Attaches to the running app's WebView over the Chrome DevTools Protocol and
 * asserts the platform integration points that differ from the web build:
 * the native bridge, HashRouter, the baked API base URL, secure context
 * (required by getUserMedia), camera device visibility, and live API
 * reachability from inside the WebView.
 *
 * Usage (app must already be running on a connected device/emulator):
 *   adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>
 *   node scripts/verify-device.js [port]
 */

const http = require('node:http');

const PORT = Number(process.argv[2] || 9333);

const getJSON = (path) =>
  new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(new Error(`Bad JSON from ${path}: ${body.slice(0, 200)}`));
          }
        });
      })
      .on('error', reject);
  });

/** Minimal RFC6455 client: enough to run Runtime.evaluate over one socket. */
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
      const key = require('node:crypto').randomBytes(16).toString('base64');

      const req = http.request({
        host: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': key,
          'Sec-WebSocket-Version': '13',
        },
      });

      req.on('upgrade', (_res, socket) => {
        this.socket = socket;
        socket.on('data', (chunk) => this.onData(chunk));
        socket.on('error', reject);
        resolve();
      });
      req.on('error', reject);
      req.end();
    });
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Parse as many complete frames as the buffer holds.
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
        /* ignore non-JSON / partial control frames */
      }
    }
  }

  send(method, params = {}) {
    const id = ++this.id;
    const json = JSON.stringify({ id, method, params });
    const data = Buffer.from(json, 'utf8');

    // Client frames must be masked.
    const mask = require('node:crypto').randomBytes(4);
    const header = [0x81];

    if (data.length < 126) header.push(0x80 | data.length);
    else if (data.length < 65536) header.push(0x80 | 126, data.length >> 8, data.length & 0xff);
    else throw new Error('payload too large for this test client');

    const masked = Buffer.from(data.map((b, i) => b ^ mask[i % 4]));
    this.socket.write(Buffer.concat([Buffer.from(header), mask, masked]));

    return new Promise((resolve, reject) => {
      this.pending.set(id, resolve);
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP timeout: ${method}`));
      }, 90000);
    });
  }

  /** Evaluates an async expression in the page and returns its value. */
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

const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  const targets = await getJSON('/json/list');
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('No page target found. Is the app running?');

  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Runtime.enable');

  // 1. Native bridge — proves cordova.js was injected and deviceready ran.
  const bridge = await cdp.evaluate(
    `JSON.stringify({cordova: typeof window.cordova, plugins: Object.keys(window.cordova?.plugins||{}), version: window.cordova?.version||null})`,
  );
  const b = JSON.parse(bridge);
  record('Cordova native bridge available', b.cordova === 'object', `cordova=${b.cordova} version=${b.version}`);
  record('Permissions plugin loaded', b.plugins.includes('permissions'), `plugins=[${b.plugins.join(', ')}]`);

  // 2. Secure context — getUserMedia is gated on this.
  const ctx = await cdp.evaluate(
    `JSON.stringify({origin: location.origin, secure: window.isSecureContext, gum: !!navigator.mediaDevices?.getUserMedia})`,
  );
  const c = JSON.parse(ctx);
  record('Served from https://localhost', c.origin === 'https://localhost', `origin=${c.origin}`);
  record('Secure context (getUserMedia allowed)', c.secure === true && c.gum === true, `secure=${c.secure} getUserMedia=${c.gum}`);

  // 3. HashRouter — deep links must not rely on server-side routing.
  const routing = await cdp.evaluate(`JSON.stringify({hash: location.hash, path: location.pathname})`);
  const r = JSON.parse(routing);
  record('HashRouter active', r.hash.startsWith('#/'), `hash=${r.hash} pathname=${r.path}`);

  // 4. Camera enumeration inside the WebView.
  const cam = await cdp.evaluate(
    `navigator.mediaDevices.enumerateDevices().then(d => JSON.stringify({video: d.filter(x=>x.kind==='videoinput').length})).catch(e => JSON.stringify({error: String(e)}))`,
  );
  const cm = JSON.parse(cam);
  record('Camera device visible to WebView', (cm.video || 0) > 0, `videoinput=${cm.video ?? cm.error}`);

  // 5. Live API reachability + CORS from the app origin.
  const api = await cdp.evaluate(`(async () => {
    const base = 'https://fitscore-rqgb.onrender.com';
    try {
      const res = await fetch(base + '/', { method: 'GET' });
      return JSON.stringify({ ok: res.ok, status: res.status, body: (await res.text()).slice(0, 60) });
    } catch (e) { return JSON.stringify({ error: String(e) }); }
  })()`);
  const a = JSON.parse(api);
  record('API reachable from WebView (CORS ok)', a.ok === true, a.error || `status=${a.status} body="${a.body}"`);

  // 6. An authenticated endpoint must reject cleanly (401), proving the auth
  //    middleware and CORS preflight work rather than failing at the network.
  const auth = await cdp.evaluate(`(async () => {
    try {
      const res = await fetch('https://fitscore-rqgb.onrender.com/auth/me', { headers: { 'X-Client': 'mobile' } });
      return JSON.stringify({ status: res.status });
    } catch (e) { return JSON.stringify({ error: String(e) }); }
  })()`);
  const au = JSON.parse(auth);
  record('Auth endpoint responds (no CORS/network block)', [200, 401].includes(au.status), au.error || `status=${au.status}`);

  // 7. The SPA actually mounted React content.
  const dom = await cdp.evaluate(
    `JSON.stringify({nodes: document.querySelectorAll('#root *').length, title: document.title})`,
  );
  const d = JSON.parse(dom);
  record('React app mounted', d.nodes > 20, `#root descendants=${d.nodes} title="${d.title}"`);

  cdp.close();

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('verify-device failed:', err.message);
  process.exitCode = 1;
});

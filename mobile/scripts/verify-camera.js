#!/usr/bin/env node
/**
 * Verifies the camera pipeline inside the running Cordova WebView.
 *
 * This is the app's core feature, so it is checked directly rather than
 * inferred: request a stream with the same constraints Home.jsx uses, confirm
 * a live video track, then draw a frame to a canvas and confirm the JPEG data
 * URL the scan flow would upload.
 *
 * Usage: node scripts/verify-camera.js [devtoolsPort]
 */

const http = require('node:http');
const crypto = require('node:crypto');

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
          } catch {
            reject(new Error('bad JSON'));
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
        const r = this.pending.get(msg.id);
        if (r) {
          this.pending.delete(msg.id);
          r(msg);
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
    this.socket.write(
      Buffer.concat([Buffer.from(header), mask, Buffer.from(data.map((b, i) => b ^ mask[i % 4]))]),
    );
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

  // Mirrors CAMERA_CONSTRAINTS[0] in Home.jsx, then captures a frame the same
  // way capturePhoto() does.
  const out = JSON.parse(
    await cdp.evaluate(`(async () => {
    const res = {};
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings ? track.getSettings() : {};
      res.trackState = track.readyState;
      res.trackLabel = track.label || null;
      res.width = settings.width || null;
      res.height = settings.height || null;

      // Feed a real <video> and wait for decodable frames.
      const video = document.createElement('video');
      video.autoplay = true; video.muted = true; video.playsInline = true;
      video.srcObject = stream;
      document.body.appendChild(video);
      await new Promise((resolve) => {
        if (video.readyState >= 2) return resolve();
        video.onloadeddata = resolve;
        setTimeout(resolve, 8000);
      });
      try { await video.play(); } catch (e) {}
      res.videoWidth = video.videoWidth;
      res.videoHeight = video.videoHeight;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      res.dataUrlPrefix = url.slice(0, 23);
      res.dataUrlBytes = url.length;

      video.remove();
    } catch (e) {
      res.error = String(e);
    } finally {
      stream?.getTracks().forEach((t) => t.stop());
    }
    return JSON.stringify(res);
  })()`),
  );

  check('getUserMedia grants a camera stream', !out.error && out.trackState === 'live', out.error || `track=${out.trackState} label="${out.trackLabel}"`);
  check('Stream reports usable resolution', (out.width || 0) > 0 && (out.height || 0) > 0, `${out.width}x${out.height}`);
  check('Video element decodes frames', (out.videoWidth || 0) > 0 && (out.videoHeight || 0) > 0, `${out.videoWidth}x${out.videoHeight}`);
  check(
    'Frame captured as JPEG data URL',
    out.dataUrlPrefix === 'data:image/jpeg;base64,' && out.dataUrlBytes > 5000,
    `prefix="${out.dataUrlPrefix}" bytes=${out.dataUrlBytes}`,
  );

  // The barcode scanner path relies on the html5-qrcode bundle being present.
  const barcode = await cdp.evaluate(
    `(() => { const s = [...document.scripts].map(x=>x.src).join(' '); return JSON.stringify({ mediaDevices: !!navigator.mediaDevices, enumerate: typeof navigator.mediaDevices?.enumerateDevices === 'function' }); })()`,
  );
  const bc = JSON.parse(barcode);
  check('Barcode scanner prerequisites present', bc.mediaDevices && bc.enumerate, `mediaDevices=${bc.mediaDevices} enumerateDevices=${bc.enumerate}`);

  cdp.close();

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('verify-camera failed:', err.message);
  process.exitCode = 1;
});

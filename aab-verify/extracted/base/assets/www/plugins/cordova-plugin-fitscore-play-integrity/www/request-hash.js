cordova.define("cordova-plugin-fitscore-play-integrity.requestHash", function(require, exports, module) {
'use strict';

function stableStringify(value) {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';

  if (Array.isArray(value)) {
    return `[${value.map((entry) => (
      entry === undefined || typeof entry === 'function' || typeof entry === 'symbol'
        ? 'null'
        : stableStringify(entry)
    )).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .filter((key) => {
        const entry = value[key];
        return entry !== undefined && typeof entry !== 'function' && typeof entry !== 'symbol';
      })
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }

  return 'null';
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function buildRequestHash(action, requestData, cryptoImplementation) {
  const cryptoApi = cryptoImplementation || globalThis.crypto;
  if (!cryptoApi?.subtle) throw new Error('Web Crypto is unavailable');

  const payload = `${action}\n${stableStringify(requestData ?? {})}`;
  const encoded = new TextEncoder().encode(payload);
  const digest = await cryptoApi.subtle.digest('SHA-256', encoded);
  return bytesToBase64Url(new Uint8Array(digest));
}

module.exports = { buildRequestHash, stableStringify };

});

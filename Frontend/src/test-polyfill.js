// Runs before the test framework is set up. React Router 7 expects the
// WHATWG TextEncoder/TextDecoder globals; jsdom's realm is separate from
// node's, so they are not inherited even on node 18+.
const { TextEncoder, TextDecoder } = require('util');
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}

// Calls an external API for an Action node (and for compensation calls).
// It returns { status, body } for ANY http answer. It only throws when the
// request itself fails (network error, timeout, blocked or invalid address).

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[?::1\]?$)/i;

function assertAllowedUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed');
  }
  // In production set BLOCK_PRIVATE_HOSTS=true so users cannot make the server call internal addresses.
  if (process.env.BLOCK_PRIVATE_HOSTS === 'true' && PRIVATE_HOST.test(parsed.hostname)) {
    throw new Error(`Calls to private addresses are blocked (${parsed.hostname})`);
  }
}

async function callApi({ url, method = 'GET', body, headers = {}, timeoutMs = 10000 }) {
  assertAllowedUrl(url);
  const verb = String(method).toUpperCase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: verb,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body !== undefined && verb !== 'GET' && verb !== 'HEAD' ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    return { status: response.status, body: parsed };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs} ms`);
    }
    throw new Error(`Request to ${url} failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callApi, assertAllowedUrl };
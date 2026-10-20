const { assertAllowedUrl } = require('../src/services/httpClient');

describe('http client address check', () => {
  afterEach(() => {
    delete process.env.BLOCK_PRIVATE_HOSTS;
  });

  test('accepts normal http and https addresses', () => {
    expect(() => assertAllowedUrl('https://api.example.com/orders')).not.toThrow();
    expect(() => assertAllowedUrl('http://example.com')).not.toThrow();
  });

  test('refuses text that is not a URL', () => {
    expect(() => assertAllowedUrl('not a url')).toThrow('Invalid URL');
  });

  test('refuses other protocols', () => {
    expect(() => assertAllowedUrl('ftp://example.com/file')).toThrow('http and https');
    expect(() => assertAllowedUrl('file:///etc/passwd')).toThrow('http and https');
  });

  test('allows local addresses by default (development)', () => {
    expect(() => assertAllowedUrl('http://localhost:5100/health')).not.toThrow();
  });

  test('blocks private addresses when BLOCK_PRIVATE_HOSTS is true', () => {
    process.env.BLOCK_PRIVATE_HOSTS = 'true';
    expect(() => assertAllowedUrl('http://localhost:5100/health')).toThrow('private addresses');
    expect(() => assertAllowedUrl('http://127.0.0.1/x')).toThrow('private addresses');
    expect(() => assertAllowedUrl('http://192.168.1.10/x')).toThrow('private addresses');
    expect(() => assertAllowedUrl('http://10.0.0.5/x')).toThrow('private addresses');
    expect(() => assertAllowedUrl('http://172.16.0.1/x')).toThrow('private addresses');
    expect(() => assertAllowedUrl('http://169.254.169.254/latest/meta-data')).toThrow('private addresses');
    expect(() => assertAllowedUrl('http://[::1]/x')).toThrow('private addresses');
  });

  test('still allows public addresses when the block is on', () => {
    process.env.BLOCK_PRIVATE_HOSTS = 'true';
    expect(() => assertAllowedUrl('https://api.example.com')).not.toThrow();
    expect(() => assertAllowedUrl('http://172.32.0.1/x')).not.toThrow();
  });
});
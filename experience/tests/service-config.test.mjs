import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultServiceURL, normalizeServiceURL, parseServiceSelection, roomCredentialKey } from '../src/home/service-config.js';

test('explicit services allow HTTPS and the three loopback hosts with canonical identities', () => {
  for (const [input, expected] of [
    [' https://EXAMPLE.com:443/service/// ', 'https://example.com/service'],
    ['http://localhost:8787/', 'http://localhost:8787'],
    ['http://127.0.0.1:8787', 'http://127.0.0.1:8787'],
    ['http://[::1]:8787/', 'http://[::1]:8787'],
  ]) assert.equal(normalizeServiceURL(input), expected);
});

test('unsafe and ambiguous explicit service addresses fail before a request is possible', () => {
  for (const value of ['', '/api', '//example.com', 'http://example.com', 'http://127.0.0.2',
    'http://localhost.example.com', 'http://localhost.', 'https://user:secret@example.com',
    'https://example.com?token=x', 'https://example.com#room=x', 'https://example.com?',
    'https://exam\nple.com', 'https://example.com\\other', 'ftp://localhost', 'javascript:alert(1)', null]) {
    assert.throws(() => normalizeServiceURL(value), undefined, String(value));
  }
});

test('build-time default retains same-origin and configured base-path behavior', () => {
  const page = 'https://paperstrange.github.io/TourGuideAI/index.html?api=https://unselected.example#endpoint=other';
  assert.equal(defaultServiceURL('', page), 'https://paperstrange.github.io');
  assert.equal(defaultServiceURL('/service/', page), 'https://paperstrange.github.io/service');
  assert.equal(defaultServiceURL('https://api.example.com/base/', page), 'https://api.example.com/base');
});

test('saved selections require a valid endpoint and explicit update method', () => {
  assert.equal(parseServiceSelection(null), null);
  assert.deepEqual(parseServiceSelection('{"endpoint":"http://localhost:8787/","transport":"poll"}'),
    { endpoint: 'http://localhost:8787', transport: 'poll' });
  for (const value of ['bad json', 'null', '{}', '{"endpoint":"http://remote.example","transport":"sse"}',
    '{"endpoint":"https://api.example","transport":"auto"}']) assert.throws(() => parseServiceSelection(value));
});

test('room credentials remain isolated by normalized service URL, path and room ID', () => {
  const key = roomCredentialKey('https://API.example:443/', 'same-room');
  assert.equal(key, roomCredentialKey('https://api.example', 'same-room'));
  for (const [endpoint, id] of [['https://other.example', 'same-room'], ['https://api.example/base', 'same-room'],
    ['https://api.example', 'other-room'], ['http://localhost:8787', 'same-room'], ['http://localhost:8788', 'same-room']]) {
    assert.notEqual(key, roomCredentialKey(endpoint, id));
  }
  assert.notEqual(roomCredentialKey('https://api.example/a', 'b:c'), roomCredentialKey('https://api.example/a:b', 'c'));
});

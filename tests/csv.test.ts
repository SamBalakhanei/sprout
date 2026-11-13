import assert from 'node:assert/strict';
import { test } from 'node:test';
import { csv } from '../services/csv';

test('raw exports preserve mixed columns, nested answers, and quoted multiline values', () => {
  const output = csv([
    { table: 'session', response: 'a,"b"\nc' },
    { table: 'event', payload: { selected: 0, correct: false } },
  ]);
  assert.equal(
    output,
    '"table","response","payload"\r\n"session","a,""b""\nc",""\r\n"event","","{""selected"":0,""correct"":false}"',
  );
});

test('spreadsheet formula prefixes are exported as text', () => {
  assert.equal(csv([{ answer: '=1+1' }]), '"answer"\r\n"\'=1+1"');
});

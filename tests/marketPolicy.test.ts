import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { lessonTradeIssue } from '../marketPolicy';

const sectors = { AAPL: 'Technology', MSFT: 'Technology', KO: 'Consumer' };
test('diversification requires a distinct known sector from every positive holding', () => {
  const holdings = [
    { symbol: 'AAPL', quantity: 1 },
    { symbol: 'KO', quantity: 0 },
  ];
  assert.equal(lessonTradeIssue('diversification', 'KO', holdings, sectors), null);
  assert.ok(lessonTradeIssue('diversification', 'MSFT', holdings, sectors));
  assert.ok(lessonTradeIssue('diversification', 'KO', [], sectors));
  assert.ok(
    lessonTradeIssue('diversification', 'KO', [{ symbol: 'UNKNOWN', quantity: 1 }], sectors),
  );
  assert.ok(lessonTradeIssue('diversification', 'UNKNOWN', holdings, sectors));
});

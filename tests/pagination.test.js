import test from 'node:test'
import assert from 'node:assert/strict'
import { clampPage, pageCount, pageRange } from '../src/lib/pagination.js'

test('journal pagination calculates stable fifty-message pages', () => {
  assert.equal(pageCount(0, 50), 1)
  assert.equal(pageCount(50, 50), 1)
  assert.equal(pageCount(51, 50), 2)
  assert.deepEqual(pageRange(2, 50), { from: 50, to: 99 })
})
test('poem pagination uses twenty-item pages', () => {
  assert.equal(pageCount(20, 20), 1)
  assert.equal(pageCount(21, 20), 2)
  assert.deepEqual(pageRange(2, 20), { from: 20, to: 39 })
})


test('journal pagination clamps invalid page requests', () => {
  assert.equal(clampPage(0, 4), 1)
  assert.equal(clampPage(9, 4), 4)
  assert.equal(clampPage(3, 4), 3)
})

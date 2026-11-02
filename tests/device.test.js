import test from 'node:test'
import assert from 'node:assert/strict'
import { isPhoneLikeDevice } from '../src/lib/device.js'

test('small touch devices are treated as phones', () => {
  assert.equal(isPhoneLikeDevice({ width: 390, height: 844, coarsePointer: true, maxTouchPoints: 5 }), true)
  assert.equal(isPhoneLikeDevice({ width: 844, height: 390, coarsePointer: false, maxTouchPoints: 5 }), true)
})

test('desktop and large touch screens keep visual effects enabled by default', () => {
  assert.equal(isPhoneLikeDevice({ width: 1440, height: 900, coarsePointer: false, maxTouchPoints: 0 }), false)
  assert.equal(isPhoneLikeDevice({ width: 1024, height: 1366, coarsePointer: true, maxTouchPoints: 5 }), false)
})

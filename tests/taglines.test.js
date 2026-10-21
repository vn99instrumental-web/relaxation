import test from 'node:test'
import assert from 'node:assert/strict'
import { getTimeBucket, getTaglineContext, getTaglinePools, pickTagline } from '../src/lib/taglines.js'

const atHour = (hour) => new Date(2026, 9, 21, hour, 0)

test('five time buckets, including late-night crossing midnight', () => {
  const checks = [[4, 'khuya'], [5, 'sang'], [10, 'sang'], [11, 'trua'],
    [13, 'trua'], [14, 'chieu'], [17, 'chieu'], [18, 'toi'], [22, 'toi'], [23, 'khuya'], [0, 'khuya']]
  for (const [hour, bucket] of checks) assert.equal(getTimeBucket(atHour(hour)), bucket)
})

test('preserve original library while adding at least twelve time-specific lines per bucket', () => {
  const counts = [[5,16], [11,15], [14,17], [18,15], [23,18]]
  for (const [hour, minimum] of counts) {
    const { time, general } = getTaglinePools([], atHour(hour))
    assert.ok(time.length >= minimum, `Not enough at hour ${hour}`)
    assert.equal(general.length, 40)
  }
})

test('the same clock and effects have the same context regardless of theme', () => {
  assert.equal(getTaglineContext(['leaves'], atHour(5)), 'sang|leaves')
  assert.equal(getTaglineContext(['rain', 'leaves'], atHour(14)), 'chieu|rain,leaves')
  assert.equal(getTaglineContext(['leaves', 'rain'], atHour(14)), 'chieu|rain,leaves')
  assert.equal(getTaglineContext([], atHour(23)), 'khuya|')
  assert.equal(getTaglineContext(['petals'], atHour(23)), 'khuya|')
})

test('rain and leaf effect pools appear only when selected', () => {
  assert.equal(getTaglinePools([], atHour(18)).effects.length, 0)
  assert.equal(getTaglinePools(['rain'], atHour(18)).effects.length, 15)
  assert.equal(getTaglinePools(['leaves'], atHour(18)).effects.length, 12)
  assert.equal(getTaglinePools(['rain', 'leaves'], atHour(18)).effects.length, 27)
})

test('selection favors the correct pool and avoids immediately repeating a sentence', () => {
  const now = atHour(5)
  const rain = pickTagline(['rain'], { now, random: () => 0 })
  assert.equal(rain, 'Mưa phùn gõ nhẹ mái hiên')
  const next = pickTagline(['rain'], { now, previous: rain, random: () => 0 })
  assert.notEqual(next, rain)
  const morning = pickTagline(['rain'], { now, random: () => 0.5 })
  assert.ok(getTaglinePools([], now).time.some(s => s.toLocaleLowerCase('vi-VN') === morning.toLocaleLowerCase('vi-VN')))
  const general = pickTagline([], { now, random: () => 0.99 })
  assert.ok(getTaglinePools([], now).general.some(s => s.toLocaleLowerCase('vi-VN') === general.toLocaleLowerCase('vi-VN')))
})

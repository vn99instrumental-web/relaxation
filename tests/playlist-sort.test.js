import test from 'node:test'
import assert from 'node:assert/strict'
import { adjacentQueueIndex, queueIndexesBySort, sortTracksNewest } from '../src/lib/playlistSort.js'

const tracks = [
  { key: 'b', title: 'Bài 10', addedAt: 10 },
  { key: 'a', title: 'Bài 2', addedAt: 30 },
  { key: 'c', title: 'Ánh trăng', addedAt: 20 },
]

test('latest and Vietnamese name sorts preserve source indexes', () => {
  assert.deepEqual(queueIndexesBySort(tracks, 'latest'), [1, 2, 0])
  assert.deepEqual(queueIndexesBySort(tracks, 'name'), [2, 1, 0])
  assert.deepEqual(sortTracksNewest(tracks).map((item) => item.track.key), ['a', 'c', 'b'])
})

test('random sort is stable for one seed and changes after reshuffle', () => {
  const first = queueIndexesBySort(tracks, 'random', 7)
  assert.deepEqual(queueIndexesBySort(tracks, 'random', 7), first)
  assert.notDeepEqual(queueIndexesBySort(tracks, 'random', 12), first)
})

test('previous and next navigation follows visible order and wraps around', () => {
  const order = queueIndexesBySort(tracks, 'latest')
  assert.equal(adjacentQueueIndex(tracks, order[0], 'previous', 'latest'), order.at(-1))
  assert.equal(adjacentQueueIndex(tracks, order.at(-1), 'next', 'latest'), order[0])
  assert.equal(adjacentQueueIndex(tracks, order[0], 'next', 'latest'), order[1])
})

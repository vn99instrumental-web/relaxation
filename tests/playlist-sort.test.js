import test from 'node:test'
import assert from 'node:assert/strict'
import { queueIndexesBySort, sortTracksNewest } from '../src/lib/playlistSort.js'

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

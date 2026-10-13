import test from 'node:test'
import assert from 'node:assert/strict'
import { applyVideoTitles, collectPlaylistVideoIds } from '../src/lib/playlistTitleSync.js'

test('collects unique video ids from recent queue and saved playlists', () => {
  const queue = [{ kind: 'video', videoId: 'one' }, { kind: 'playlist', playlistId: 'list' }]
  const playlists = [{ tracks: [{ kind: 'video', videoId: 'one' }, { kind: 'video', videoId: 'two' }] }]
  assert.deepEqual(collectPlaylistVideoIds(queue, playlists), ['one', 'two'])
})

test('applies fetched titles without changing failed or non-video tracks', () => {
  const source = [
    { kind: 'video', videoId: 'one', title: '' },
    { kind: 'video', videoId: 'two', title: 'Tên cũ' },
    { kind: 'playlist', playlistId: 'list', title: 'Danh sách' },
  ]
  const result = applyVideoTitles(source, { one: 'Tên mới', two: '', list: 'Không áp dụng' })

  assert.equal(result.updatedCount, 1)
  assert.equal(result.tracks[0].title, 'Tên mới')
  assert.equal(result.tracks[1], source[1])
  assert.equal(result.tracks[2], source[2])
})

test('updates an existing title when YouTube returns a newer name', () => {
  const source = [{ kind: 'video', videoId: 'one', title: 'Tên cũ', addedAt: 12 }]
  const result = applyVideoTitles(source, { one: 'Tên chính thức' })

  assert.equal(result.updatedCount, 1)
  assert.deepEqual(result.tracks[0], { kind: 'video', videoId: 'one', title: 'Tên chính thức', addedAt: 12 })
})

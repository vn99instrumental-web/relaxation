import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlaylistBackup, parsePlaylistBackup } from '../src/lib/playlistBackup.js'

test('playlist backup round-trips portable tracks', () => {
  const backup = createPlaylistBackup([{ name: ' Mưa ', tracks: [{ kind: 'video', videoId: 'abc', title: 'Bài hát', addedAt: 12 }] }])
  assert.equal(backup.format, 'duoi-tan-thong.playlists')
  assert.deepEqual(parsePlaylistBackup(JSON.stringify(backup)), [{ name: 'Mưa', tracks: [{ kind: 'video', videoId: 'abc', title: 'Bài hát', addedAt: 12 }] }])
})

test('playlist backup rejects unrelated JSON', () => {
  assert.throws(() => parsePlaylistBackup('{"hello":"world"}'), /Không tìm thấy/)
})

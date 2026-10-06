import test from 'node:test'
import assert from 'node:assert/strict'
import { playlistNameForTrack } from '../src/lib/trackPlaylist.js'

const playlists = [
  { id: 'morning', name: 'Bu?i s?ng', tracks: [{ kind: 'video', videoId: 'abc' }] },
  { id: 'night', name: '??m m?a', tracks: [{ kind: 'video', videoId: 'xyz' }] },
]

test('finds the saved playlist for a track from the combined recent list', () => {
  assert.equal(playlistNameForTrack({ kind: 'video', videoId: 'xyz' }, playlists), '??m m?a')
})

test('prefers explicit playlist source and its latest name', () => {
  const track = { kind: 'video', videoId: 'abc', sourcePlaylistId: 'night', sourcePlaylistName: 'T?n c?' }
  assert.equal(playlistNameForTrack(track, playlists), '??m m?a')
})

test('keeps M?i ??ng fallback available for a standalone video', () => {
  assert.equal(playlistNameForTrack({ kind: 'video', videoId: 'standalone' }, playlists), '')
})

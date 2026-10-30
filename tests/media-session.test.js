import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearLockScreenActions,
  LOCK_SCREEN_ACTIONS,
  registerLockScreenActions,
} from '../src/lib/mediaSession.js'

test('lock screen prioritizes previous and next over ten-second seek actions', () => {
  const registered = new Map()
  const mediaSession = {
    setActionHandler(action, handler) { registered.set(action, handler) },
  }
  const handlers = Object.fromEntries(LOCK_SCREEN_ACTIONS.map((action) => [action, () => action]))

  registerLockScreenActions(mediaSession, handlers)

  assert.equal(registered.get('previoustrack'), handlers.previoustrack)
  assert.equal(registered.get('nexttrack'), handlers.nexttrack)
  assert.equal(registered.get('seekbackward'), null)
  assert.equal(registered.get('seekforward'), null)
  assert.equal(registered.get('seekto'), handlers.seekto)

  clearLockScreenActions(mediaSession)
  for (const handler of registered.values()) assert.equal(handler, null)
})
export const LOCK_SCREEN_ACTIONS = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']
export const HIDDEN_LOCK_SCREEN_ACTIONS = ['seekbackward', 'seekforward']

function setAction(mediaSession, action, handler) {
  try {
    mediaSession.setActionHandler(action, handler)
  } catch {
    // Some browsers expose Media Session but do not support every action.
  }
}

export function registerLockScreenActions(mediaSession, handlers) {
  LOCK_SCREEN_ACTIONS.forEach((action) => setAction(mediaSession, action, handlers[action] || null))

  // Compact mobile lock screens have limited action slots. Removing the two
  // dedicated 10-second actions makes Previous/Next visible; seekto keeps the
  // system progress bar usable on platforms that expose it.
  HIDDEN_LOCK_SCREEN_ACTIONS.forEach((action) => setAction(mediaSession, action, null))
}

export function clearLockScreenActions(mediaSession) {
  const actions = [...LOCK_SCREEN_ACTIONS, ...HIDDEN_LOCK_SCREEN_ACTIONS]
  actions.forEach((action) => setAction(mediaSession, action, null))
}
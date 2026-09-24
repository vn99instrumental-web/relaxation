import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const ActionContext = createContext(null)

export function ActionProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const [undo, setUndo] = useState(null)
  const timerRef = useRef(null)
  const resolveRef = useRef(null)

  const closeDialog = useCallback((value) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setDialog(null)
  }, [])

  const confirm = useCallback(({ title = 'Xác nhận', message, confirmLabel = 'Xác nhận', danger = false }) => new Promise((resolve) => {
    resolveRef.current?.(false)
    resolveRef.current = resolve
    setDialog({ type: 'confirm', title, message, confirmLabel, danger })
  }), [])

  const prompt = useCallback(({ title = 'Nhập thông tin', message = '', value = '', confirmLabel = 'Lưu' }) => new Promise((resolve) => {
    resolveRef.current?.(null)
    resolveRef.current = resolve
    setDialog({ type: 'prompt', title, message, value, confirmLabel })
  }), [])

  const schedule = useCallback(({ message, action, delay = 6500 }) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; undo?.action?.() }
    const item = { message, action }
    setUndo(item)
    timerRef.current = setTimeout(() => { action(); timerRef.current = null; setUndo(null) }, delay)
  }, [undo])

  const cancelScheduled = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null; setUndo(null)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); resolveRef.current?.(false) }, [])
  useEffect(() => {
    if (!dialog) return undefined
    const onKey = (event) => { if (event.key === 'Escape') closeDialog(dialog.type === 'prompt' ? null : false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dialog, closeDialog])

  return <ActionContext.Provider value={{ confirm, prompt, schedule }}>
    {children}
    {dialog && createPortal(<ThemedDialog dialog={dialog} onClose={closeDialog} />, document.body)}
    {undo && createPortal(<div className="undo-toast" role="status"><span>{undo.message}</span><button type="button" onClick={cancelScheduled}>Hoàn tác</button></div>, document.body)}
  </ActionContext.Provider>
}

export function useActions() {
  const value = useContext(ActionContext)
  if (!value) throw new Error('useActions must be used inside ActionProvider')
  return value
}

function ThemedDialog({ dialog, onClose }) {
  const [value, setValue] = useState(dialog.value || '')
  const submit = (event) => { event.preventDefault(); onClose(dialog.type === 'prompt' ? value.trim() : true) }
  return <div className="action-dialog__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(dialog.type === 'prompt' ? null : false) }}>
    <form className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" onSubmit={submit}>
      <h2 id="action-dialog-title">{dialog.title}</h2>
      {dialog.message && <p>{dialog.message}</p>}
      {dialog.type === 'prompt' && <input autoFocus value={value} onChange={(event) => setValue(event.target.value)} />}
      <div className="action-dialog__buttons">
        <button type="button" className="link-btn" onClick={() => onClose(dialog.type === 'prompt' ? null : false)}>Hủy</button>
        <button type="submit" className={dialog.danger ? 'is-danger' : ''} disabled={dialog.type === 'prompt' && !value.trim()}>{dialog.confirmLabel}</button>
      </div>
    </form>
  </div>
}

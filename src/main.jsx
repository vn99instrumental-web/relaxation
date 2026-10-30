import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ActionProvider } from './components/ActionProvider.jsx'
import './styles.css'
import './journal-lock.css'
import './brand-embrace.css'

class AppErrorBoundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    try { console.error('App render error', error, info) } catch { /* ignore logging failures */ }
  }

  render() {
    if (!this.state.error) return this.props.children
    const message = this.state.error?.message || 'Không thể khởi tạo giao diện.'
    return React.createElement('main', {
      role: 'alert',
      style: { minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, background: '#17120c', color: '#fdf8f0', fontFamily: 'system-ui, sans-serif', textAlign: 'center' },
    }, React.createElement('section', { style: { maxWidth: 520 } },
      React.createElement('h1', { style: { margin: '0 0 12px', fontSize: 22 } }, 'Dưới Tán Thông'),
      React.createElement('p', { style: { margin: '0 0 16px', lineHeight: 1.5 } }, 'Giao diện gặp lỗi khi khởi động. Hãy tải lại trang để thử lại.'),
      React.createElement('button', { type: 'button', onClick: () => window.location.reload(), style: { padding: '10px 18px', border: '1px solid #dcb877', borderRadius: 8, background: 'transparent', color: '#fdf8f0', cursor: 'pointer' } }, 'Tải lại'),
      React.createElement('details', { style: { marginTop: 18, textAlign: 'left', opacity: .75 } },
        React.createElement('summary', null, 'Chi tiết lỗi'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, message),
      ),
    ))
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary><ActionProvider><App /></ActionProvider></AppErrorBoundary>
  </React.StrictMode>,
)

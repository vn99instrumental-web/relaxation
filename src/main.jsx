import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './journal-lock.css'
import './brand-embrace.css'
import './yahoo-preview.css'
import './yahoo-layout-fix.css'

document.documentElement.classList.add('yahoo-preview')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

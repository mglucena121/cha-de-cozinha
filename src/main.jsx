import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2800,
          style: {
            borderRadius: '14px',
            border: '1px solid rgba(120, 72, 47, 0.16)',
            background: '#fdf9f3',
            color: '#5d3a2a',
            boxShadow: '0 10px 24px rgba(93, 58, 42, 0.12)',
          },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)

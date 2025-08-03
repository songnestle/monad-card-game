import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BullrunApp from './BullrunApp.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// 检测开发环境
const isDevelopment = import.meta.env.DEV

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary development={isDevelopment}>
      <BullrunApp />
    </ErrorBoundary>
  </StrictMode>,
)

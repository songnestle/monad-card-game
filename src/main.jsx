import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MinimalApp from './MinimalApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MinimalApp />
  </StrictMode>,
)

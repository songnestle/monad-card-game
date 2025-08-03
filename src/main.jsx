import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CleanApp from './CleanApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CleanApp />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ProductionApp from './ProductionApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProductionApp />
  </StrictMode>,
)

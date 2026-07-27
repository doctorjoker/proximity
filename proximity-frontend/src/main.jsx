import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import EnterpriseUXRoot from './components/workspace/ux/EnterpriseUXRoot.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EnterpriseUXRoot>
      <App />
    </EnterpriseUXRoot>
  </StrictMode>,
)

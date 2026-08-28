import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Agentation } from 'agentation'
import './index.css'
import App from './App.jsx'
import { DeviceProvider } from './component/DeviceContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DeviceProvider>
      <App />
    </DeviceProvider>
    {import.meta.env.DEV && <Agentation />}
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch((err) => {
                console.error('Service worker registration failed', err)
            })
        })
    } else {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => registration.unregister())
        })
    }
}
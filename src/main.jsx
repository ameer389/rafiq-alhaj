import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './fonts.css' // self-hosted (precached) so Arabic + Urdu Nastaliq render offline
import './index.css'
import './lib/install' // capture `beforeinstallprompt` as early as possible
import App from './App'
import { I18nProvider } from './i18n'
import { SessionProvider } from './lib/session'
import { ToastProvider } from './lib/toast'
import { applyTextSize } from './lib/textSize'

applyTextSize() // before first paint, so a saved "large text" never flashes small

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <ToastProvider>
          <SessionProvider>
            <App />
          </SessionProvider>
        </ToastProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
)

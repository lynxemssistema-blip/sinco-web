window.addEventListener('error', (e) => {
  document.body.innerHTML = '<div style="color:red;padding:20px;z-index:9999;position:fixed;background:white;top:0;left:0;width:100%;height:100%">' + e.message + '<br/>' + (e.error && e.error.stack) + '</div>';
});
import './lib/fetchInterceptor' 
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './contexts/ToastContext.tsx'


createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <ToastProvider>
 <App />
 </ToastProvider>
 </StrictMode>,
)

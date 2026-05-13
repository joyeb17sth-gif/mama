import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { isSupabaseConfigured } from './utils/supabaseClient.js'

if (!isSupabaseConfigured) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1 style={{ color: '#d32f2f' }}>System Configuration Error</h1>
      <p>The application could not connect to the database.</p>
      <p><b>Missing Environment Variables:</b> VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY.</p>
      <p>Please configure these in your deployment settings (e.g. Vercel) and redeploy.</p>
    </div>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

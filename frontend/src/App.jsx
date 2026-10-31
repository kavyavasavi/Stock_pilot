
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './Service/Supabase/client'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sales from './pages/Sales'
import PurchaseInvoices from './pages/PurchaseInvoices'
import Forecasting from './pages/Forecasting'
import InventoryAssistant from './pages/InventoryAssistant'
import ResetPassword from './pages/ResetPassword'


function ProtectedRoute({ session, loading, children }) {
  if (loading) {
    return <div className="app-loading">Loading StockPilot AI...</div>
  }

  return session ? children : <Navigate to="/login" replace />
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return

      if (error) console.error('Session error:', error.message)
      setSession(data?.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/login"
          element={
            loading ? (
              <div className="app-loading">Loading...</div>
            ) : session ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <Dashboard session={session} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <Products session={session} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <Sales session={session} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <PurchaseInvoices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/forecasting"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <Forecasting />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assistant"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <InventoryAssistant />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

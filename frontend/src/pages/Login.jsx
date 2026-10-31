
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../Service/Supabase/client'
import './pages.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="auth-page">
      <div className="auth-decoration"></div>

      <Link to="/" className="auth-brand">
        <span className="brand-icon">S</span>
        StockPilot<span className="brand-ai">AI</span>
      </Link>

      <div className="auth-card">
        <div className="auth-icon">S</div>

        <span className="auth-eyebrow">WELCOME BACK</span>
        <h1>Sign in to StockPilot</h1>
        <p>Access your inventory workspace.</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@business.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in to your account →'}
          </button>
        </form>

        <div className="auth-security">
          <span>🔒</span>
          Secure authentication powered by Supabase
        </div>
      </div>

      <Link to="/" className="back-home">← Back to homepage</Link>
    </div>
  )
}

export default Login

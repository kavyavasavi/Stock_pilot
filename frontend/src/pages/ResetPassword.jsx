
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../Service/Supabase/client'
import './pages.css'
import BackToOverview from '../components/BackToOverview'

function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Password updated successfully! You can now sign in.')

    await supabase.auth.signOut()

    setTimeout(() => navigate('/login'), 1500)
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-brand">
        <span className="brand-icon">S</span>
        StockPilot<span className="brand-ai">AI</span>
      </Link>

      <div className="auth-card">
        <span className="auth-eyebrow">ACCOUNT RECOVERY</span>
        <h1>Reset your password</h1>
        <p>Choose a new password for your account.</p>

        <form onSubmit={handleReset}>
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            minLength={6}
            required
          />

          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            minLength={6}
            required
          />

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="product-success">{success}</div>}

          <button className="auth-submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update password →'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword

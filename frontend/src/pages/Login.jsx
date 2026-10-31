
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../Service/Supabase/client'
import './pages.css'

function Login() {
  const navigate = useNavigate()

  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)



  async function handleForgotPassword() {
  setError('')
  setSuccess('')

  if (!email.trim()) {
    setError('Enter your email address first.')
    return
  }

  setLoading(true)

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {
      redirectTo: `${window.location.origin}/reset-password`
    }
  )

  setLoading(false)

  if (error) {
    setError(error.message)
  } else {
    setSuccess('Password reset link sent! Check your email.')
  }
}

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isSignup) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.')
        }

        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }

const { data, error: signupError } =
  await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: name.trim(),
        business_name: businessName.trim()
      },
      emailRedirectTo: `${window.location.origin}/login`
    }
  })

if (signupError) throw signupError

if (!data.user) {
  throw new Error('Account registration failed.')
}

if (!data.session) {
  setSuccess(
    'Account created! Please verify your email before signing in.'
  )
  return
}

navigate('/dashboard')

        if (signupError) throw signupError

        // A session is needed to create the business profile.
        if (!data.session) {
          setSuccess(
            'Account created. Please verify your email, then sign in. If email verification is enabled, business setup must be completed after verification.'
          )
          return
        }

        const { error: profileError } = await supabase.rpc(
          'register_business_owner',
          {
            p_business_name: businessName.trim(),
            p_full_name: name.trim()
          }
        )

        if (profileError) {
          await supabase.auth.signOut()
          throw profileError
        }

        navigate('/dashboard')
      } else {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          })

        if (loginError) throw loginError

        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function switchMode() {
    setIsSignup(value => !value)
    setError('')
    setSuccess('')
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

        <span className="auth-eyebrow">
          {isSignup ? 'GET STARTED' : 'WELCOME BACK'}
        </span>

        <h1>
          {isSignup ? 'Create your account' : 'Sign in to StockPilot'}
        </h1>

        <p>
          {isSignup
            ? 'Set up your business inventory workspace.'
            : 'Access your inventory workspace.'}
        </p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <>
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={event => setName(event.target.value)}
                autoComplete="name"
                required
              />

              <label htmlFor="businessName">Business name</label>
              <input
                id="businessName"
                type="text"
                placeholder="Your business name"
                value={businessName}
                onChange={event => setBusinessName(event.target.value)}
                required
              />
            </>
          )}

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
{!isSignup && (
  <div style={{ textAlign: 'right', margin: '8px 0 16px' }}>
    <button
      type="button"
      onClick={handleForgotPassword}
      disabled={loading}
      style={{
        background: 'none',
        border: 'none',
        color: '#eab308',
        cursor: 'pointer'
      }}
    >
      Forgot password?
    </button>
  </div>
)}
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={6}
            required
          />

          {isSignup && (
            <>
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </>
          )}

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="product-success">{success}</div>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isSignup
                ? 'Create account →'
                : 'Sign in to your account →'}
          </button>
        </form>

        <div className="auth-security">
          <span>🔒</span>
          Secure authentication powered by Supabase
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          {isSignup ? 'Already have an account? ' : "New to StockPilot? "}
          <button
            type="button"
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: '#eab308',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        </div>
      </div>

      <Link to="/" className="back-home">← Back to homepage</Link>
    </div>
  )
}

export default Login

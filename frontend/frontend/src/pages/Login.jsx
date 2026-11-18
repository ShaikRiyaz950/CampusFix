import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Button from '../components/Button'
import { loginStudent } from '../services/api'

function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
    setErrors({ ...errors, [event.target.name]: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.email.trim()) nextErrors.email = 'Email address is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Enter a valid email address.'
    if (!form.password) nextErrors.password = 'Password is required.'

    setErrors(nextErrors)
    setServerError('')
    setSubmitted(false)
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    try {
      const data = await loginStudent({ email: form.email, password: form.password })
      if (data?.token) localStorage.setItem('campusfix_token', data.token)
      if (data?.student) localStorage.setItem('campusfix_student', JSON.stringify(data.student))
      setSubmitted(true)
      navigate('/dashboard')
    } catch (error) {
      setServerError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <Link to="/" className="auth-brand"><Logo /></Link>
        <div className="auth-card">
          <span className="auth-kicker">Student portal</span>
          <h1 id="login-title">Welcome back</h1>
          <p className="auth-intro">Log in to submit complaints and track your updates.</p>

          {submitted && (
            <div className="form-success" role="status">
              Login successful.
            </div>
          )}
          {serverError && <div className="form-error" role="alert">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="student@college.edu"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-field">
              <div className="field-label-row">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={updateField}
                placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <Button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </form>

          <p className="auth-switch">
            New to CampusFix? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </section>

      <aside className="auth-side" aria-label="CampusFix information">
        <div className="auth-side-content">
          <span className="auth-side-label">Stay informed</span>
          <h2>Every complaint matters.</h2>
          <p>Submit campus problems and follow the progress from one convenient portal.</p>
          <div className="auth-steps">
            <span><strong>1</strong> Submit</span>
            <span><strong>2</strong> Track</span>
            <span><strong>3</strong> Resolve</span>
          </div>
        </div>
      </aside>
    </main>
  )
}

export default Login

import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import Button from '../components/Button'
import { registerStudent } from '../services/api'

const departments = [
  'Computer Science',
  'Information Technology',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Electronics',
  'Business Administration',
  'Arts and Science',
]

function Register() {
  const [form, setForm] = useState({
    name: '',
    rollNumber: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
    setErrors({ ...errors, [event.target.name]: '' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = 'Student name is required.'
    if (!form.rollNumber.trim()) nextErrors.rollNumber = 'Roll number is required.'
    if (!form.email.trim()) nextErrors.email = 'Email address is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Enter a valid email address.'
    if (!form.department) nextErrors.department = 'Select your department.'
    if (!form.password) nextErrors.password = 'Password is required.'
    else if (form.password.length < 6) nextErrors.password = 'Password must be at least 6 characters.'
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirm your password.'
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'

    setErrors(nextErrors)
    setServerError('')
    setSubmitted(false)
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    try {
      await registerStudent({
        name: form.name,
        roll_number: form.rollNumber,
        email: form.email,
        department: form.department,
        password: form.password,
      })
      setSubmitted(true)
    } catch (error) {
      setServerError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page register-page">
      <section className="auth-panel" aria-labelledby="register-title">
        <Link to="/" className="auth-brand"><Logo /></Link>
        <div className="auth-card register-card">
          <span className="auth-kicker">Student registration</span>
          <h1 id="register-title">Create your account</h1>
          <p className="auth-intro">Register to report campus issues and track complaints.</p>

          {submitted && (
            <div className="form-success" role="status">
              Account created successfully. You can now log in.
            </div>
          )}
          {serverError && <div className="form-error" role="alert">{serverError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="student-name">Student name</label>
                <input id="student-name" name="name" value={form.name} onChange={updateField} placeholder="Full name" aria-invalid={Boolean(errors.name)} />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="roll-number">Roll number</label>
                <input id="roll-number" name="rollNumber" value={form.rollNumber} onChange={updateField} placeholder="e.g. 21CS014" aria-invalid={Boolean(errors.rollNumber)} />
                {errors.rollNumber && <span className="field-error">{errors.rollNumber}</span>}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="register-email">Email address</label>
              <input id="register-email" name="email" type="email" value={form.email} onChange={updateField} placeholder="student@college.edu" aria-invalid={Boolean(errors.email)} />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="department">Department</label>
              <select id="department" name="department" value={form.department} onChange={updateField} aria-invalid={Boolean(errors.department)}>
                <option value="">Select department</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              {errors.department && <span className="field-error">{errors.department}</span>}
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="register-password">Password</label>
                <div className="password-field">
                  <input id="register-password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField} placeholder="Minimum 6 characters" aria-invalid={Boolean(errors.password)} />
                  <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
              <div className="form-field">
                <label htmlFor="confirm-password">Confirm password</label>
                <div className="password-field">
                  <input id="confirm-password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={updateField} placeholder="Re-enter password" aria-invalid={Boolean(errors.confirmPassword)} />
                  <button type="button" className="password-toggle" aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)}>
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
            </div>

            <Button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>

      <aside className="auth-side register-side" aria-label="CampusFix benefits">
        <div className="auth-side-content">
          <span className="auth-side-label">Join CampusFix</span>
          <h2>Be part of a better campus.</h2>
          <p>Create an account to report, monitor and resolve campus facilities problems.</p>
          <div className="auth-feature-list">
            <span><b>01</b> Simple complaint submission</span>
            <span><b>02</b> Clear status updates</span>
            <span><b>03</b> Faster issue resolution</span>
          </div>
        </div>
      </aside>
    </main>
  )
}

export default Register

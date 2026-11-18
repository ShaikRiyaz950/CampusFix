import { useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { submitComplaint } from '../services/api'
import CategoryIcon from '../components/icons/CategoryIcon'

const categories = [
  { label: 'Classroom', value: 'Classroom facilities', icon: 'Classroom' },
  { label: 'Laboratory', value: 'Laboratory equipment', icon: 'Laboratory' },
  { label: 'Drinking Water', value: 'Drinking water', icon: 'Drinking Water' },
  { label: 'Electricity', value: 'Electricity', icon: 'Electricity' },
  { label: 'Washroom', value: 'Washroom maintenance', icon: 'Washroom' },
  { label: 'Cleanliness', value: 'Campus cleanliness', icon: 'Cleanliness' },
  { label: 'Furniture', value: 'Furniture', icon: 'Furniture' },
  { label: 'Infrastructure', value: 'Infrastructure', icon: 'Infrastructure' },
  { label: 'Internet', value: 'Internet', icon: 'Internet' },
  { label: 'Other', value: 'Other facilities', icon: 'Other' },
]

function SubmitComplaint() {
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    location: '',
  })
  const [attachment, setAttachment] = useState(null)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
    setErrors({ ...errors, [event.target.name]: '' })
    setSubmitted(false)
  }

  const updateAttachment = (event) => {
    setAttachment(event.target.files?.[0] || null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!form.title.trim()) nextErrors.title = 'Complaint title is required.'
    else if (form.title.trim().length < 5) nextErrors.title = 'Use at least 5 characters.'
    if (!form.category) nextErrors.category = 'Select a complaint category.'
    if (!form.description.trim()) nextErrors.description = 'Describe the issue.'
    else if (form.description.trim().length < 20) nextErrors.description = 'Describe the issue in at least 20 characters.'
    if (!form.location.trim()) nextErrors.location = 'Campus location is required.'

    setErrors(nextErrors)
    setServerError('')
    setSubmitted(false)
    if (Object.keys(nextErrors).length) return

    const payload = new FormData()
    payload.append('title', form.title)
    payload.append('category', form.category)
    payload.append('description', form.description)
    payload.append('location', form.location)
    if (attachment) payload.append('image', attachment)

    setLoading(true)
    try {
      await submitComplaint(payload)
      setSubmitted(true)
      setForm({ title: '', category: '', description: '', location: '' })
      setAttachment(null)
    } catch (error) {
      setServerError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="complaint-page">
      <aside className="complaint-sidebar">
        <Link to="/" className="brand-link"><Logo /></Link>
        <nav className="sidebar-nav" aria-label="Complaint navigation">
          <Link to="/dashboard"><span className="sidebar-icon">H</span>Overview</Link>
          <Link to="/complaints" className="active"><span className="sidebar-icon">+</span>New complaint</Link>
          <Link to="/track"><span className="sidebar-icon">C</span>My complaints</Link>
          <Link to="/profile"><span className="sidebar-icon">U</span>Profile</Link>
        </nav>
        <Link to="/dashboard" className="back-dashboard">Back to dashboard</Link>
      </aside>

      <section className="complaint-content">
        <header className="complaint-header">
          <div>
            <Link to="/dashboard" className="complaint-breadcrumb">Dashboard / New complaint</Link>
            <h1>Submit a complaint</h1>
            <p>Provide the details below to report a campus issue.</p>
          </div>
        </header>

        <div className="complaint-layout">
          <form className="complaint-form" onSubmit={handleSubmit} noValidate>
            {submitted && (
              <div className="form-success complaint-success" role="status">
                Complaint submitted successfully.
              </div>
            )}
            {serverError && <div className="form-error" role="alert">{serverError}</div>}

            <div className="form-field">
              <label htmlFor="complaint-title">Complaint title</label>
              <input
                id="complaint-title"
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="Briefly describe the issue"
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            <div className="form-field">
              <span className="category-field-label" id="complaint-category-label">Category</span>
              <div className="category-card-grid" role="radiogroup" aria-labelledby="complaint-category-label">
                {categories.map((category) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={form.category === category.value}
                    key={category.value}
                    className={`category-card ${form.category === category.value ? 'selected' : ''}`}
                    onClick={() => {
                      setForm({ ...form, category: category.value })
                      setErrors({ ...errors, category: '' })
                      setSubmitted(false)
                    }}
                  >
                    <CategoryIcon name={category.icon} selected={form.category === category.value} />
                    <span>{category.label}</span>
                  </button>
                ))}
              </div>
              {errors.category && <span className="field-error">{errors.category}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="complaint-description">Description</label>
              <textarea
                id="complaint-description"
                name="description"
                value={form.description}
                onChange={updateField}
                rows="6"
                maxLength="500"
                placeholder="Explain what happened, when you noticed it and any useful details..."
                aria-invalid={Boolean(errors.description)}
              />
              <div className="field-meta">
                {errors.description
                  ? <span className="field-error">{errors.description}</span>
                  : <span>Minimum 20 characters</span>}
                <span>{form.description.length}/500</span>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="complaint-location">Campus location</label>
              <input
                id="complaint-location"
                name="location"
                value={form.location}
                onChange={updateField}
                placeholder="Building, block, room or area"
                aria-invalid={Boolean(errors.location)}
              />
              {errors.location && <span className="field-error">{errors.location}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="complaint-image">Attachment <span className="optional-label">Optional</span></label>
              <label className="attachment-upload" htmlFor="complaint-image">
                <span className="attachment-icon">+</span>
                <span>
                  <strong>{attachment ? attachment.name : 'Upload an image'}</strong>
                  <small>{attachment ? 'Click to replace the selected file' : 'PNG or JPG, up to 5 MB'}</small>
                </span>
              </label>
              <input
                className="attachment-input"
                id="complaint-image"
                name="image"
                type="file"
                accept="image/png,image/jpeg"
                onChange={updateAttachment}
              />
            </div>

            <button type="submit" className="complaint-submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit complaint'}
            </button>
          </form>

          <aside className="complaint-guide">
            <span className="section-kicker">Before submitting</span>
            <h2>Helpful tips</h2>
            <div className="guide-item">
              <span>1</span>
              <p><strong>Be specific</strong>Use a clear title that explains the issue.</p>
            </div>
            <div className="guide-item">
              <span>2</span>
              <p><strong>Add details</strong>Include the exact location and when it happened.</p>
            </div>
            <div className="guide-item">
              <span>3</span>
              <p><strong>Stay professional</strong>Describe the problem calmly and accurately.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default SubmitComplaint

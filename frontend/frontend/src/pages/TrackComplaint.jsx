import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import { getComplaints } from '../services/api'

const initialComplaints = [
  {
    id: 'CF-1024',
    title: 'Drinking water issue',
    category: 'Drinking water',
    location: 'Science Block, Floor 2',
    date: '18 Nov 2026',
    status: 'In Progress',
    description: 'The drinking water dispenser is not working and there is no drinking water available near the science laboratories.',
  },
  {
    id: 'CF-1021',
    title: 'Library fan not working',
    category: 'Electricity',
    location: 'Central Library',
    date: '16 Nov 2026',
    status: 'Resolved',
    description: 'The ceiling fan near the third reading table was not operating and produced an unusual noise.',
  },
  {
    id: 'CF-1018',
    title: 'Classroom desk damaged',
    category: 'Classroom facilities',
    location: 'Academic Block B, Room 204',
    date: '14 Nov 2026',
    status: 'Pending',
    description: 'A desk near the middle row is damaged and cannot remain stable while students write.',
  },
]

const statusDescriptions = {
  Pending: 'Complaint received and awaiting action.',
  'In Progress': 'Complaint is being handled.',
  Resolved: 'Complaint has been resolved.',
}

function normalizeComplaint(complaint) {
  const status = complaint.status || complaint.status_name || 'Pending'
  const normalizedStatus = status.toLowerCase().replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

  return {
    id: complaint.id ? `CF-${complaint.id}` : complaint.complaint_id || 'CF-Unknown',
    title: complaint.title || 'Untitled complaint',
    category: complaint.category || 'Other facilities',
    location: complaint.location || 'Location not provided',
    date: complaint.submitted_at || complaint.created_at || complaint.date || 'Date unavailable',
    status: ['Pending', 'In Progress', 'Resolved'].includes(normalizedStatus)
      ? normalizedStatus
      : 'Pending',
    description: complaint.description || 'No description provided.',
  }
}

function TrackComplaint() {
  const [filter, setFilter] = useState('All')
  const [selectedId, setSelectedId] = useState('CF-1024')
  const [complaints, setComplaints] = useState(initialComplaints)
  const [loading, setLoading] = useState(true)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    let active = true

    getComplaints()
      .then((data) => {
        if (!active) return
        const rows = Array.isArray(data) ? data : data?.complaints
        if (Array.isArray(rows) && rows.length) {
          setComplaints(rows.map(normalizeComplaint))
          setSelectedId(normalizeComplaint(rows[0]).id)
        }
      })
      .catch((error) => {
        if (active) setServerError(error.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  const filteredComplaints = filter === 'All'
    ? complaints
    : complaints.filter((complaint) => complaint.status === filter)

  const selectedComplaint = complaints.find((complaint) => complaint.id === selectedId)

  return (
    <main className="tracking-page">
      <aside className="tracking-sidebar">
        <Link to="/" className="brand-link"><Logo /></Link>
        <nav className="sidebar-nav" aria-label="Tracking navigation">
          <Link to="/dashboard"><span className="sidebar-icon">H</span>Overview</Link>
          <Link to="/complaints"><span className="sidebar-icon">+</span>New complaint</Link>
          <Link to="/track" className="active"><span className="sidebar-icon">C</span>My complaints</Link>
          <Link to="/profile"><span className="sidebar-icon">U</span>Profile</Link>
        </nav>
        <Link to="/dashboard" className="back-dashboard">Back to dashboard</Link>
      </aside>

      <section className="tracking-content">
        <header className="tracking-header">
          <div>
            <Link to="/dashboard" className="complaint-breadcrumb">Dashboard / My complaints</Link>
            <h1>Track complaints</h1>
            <p>View the status and details of your submitted complaints.</p>
          </div>
          <Link to="/complaints" className="tracking-new-button">+ New complaint</Link>
        </header>

        <div className="tracking-filter" aria-label="Filter complaints by status">
          {['All', 'Pending', 'In Progress', 'Resolved'].map((option) => (
            <button
              type="button"
              key={option}
              className={filter === option ? 'active' : ''}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>

        {loading && (
          <div className="tracking-skeleton" aria-label="Loading complaints">
            {[1, 2, 3].map((item) => (
              <div className="tracking-skeleton-card" key={item}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        )}
        {serverError && <div className="form-error">{serverError} Showing demo data.</div>}

        <div className="tracking-layout">
          <section className="tracking-list" aria-label="Complaint list">
            {filteredComplaints.map((complaint) => (
              <article
                className={`tracking-card ${selectedId === complaint.id ? 'selected' : ''}`}
                key={complaint.id}
              >
                <button
                  type="button"
                  className="tracking-card-main"
                  onClick={() => setSelectedId(complaint.id)}
                  aria-expanded={selectedId === complaint.id}
                >
                  <div className="tracking-card-title">
                    <span className="tracking-type-icon">!</span>
                    <div>
                      <span className="tracking-id">{complaint.id}</span>
                      <h2>{complaint.title}</h2>
                    </div>
                  </div>
                  <span className={`tracking-status status-${complaint.status.toLowerCase().replaceAll(' ', '-')}`}>
                    {complaint.status}
                  </span>
                </button>

                <div className="tracking-card-meta">
                  <span><b>Category</b>{complaint.category}</span>
                  <span><b>Submitted</b>{complaint.date}</span>
                  <button type="button" onClick={() => setSelectedId(complaint.id)}>
                    View details
                  </button>
                </div>
              </article>
            ))}

            {filteredComplaints.length === 0 && (
              <div className="tracking-empty">No complaints found for this status.</div>
            )}
          </section>

          {selectedComplaint && (
            <aside className="tracking-details" aria-live="polite">
              <div className="tracking-details-head">
                <div>
                  <span>Complaint details</span>
                  <h2>{selectedComplaint.id}</h2>
                </div>
                <span className={`tracking-status status-${selectedComplaint.status.toLowerCase().replaceAll(' ', '-')}`}>
                  {selectedComplaint.status}
                </span>
              </div>

              <h3>{selectedComplaint.title}</h3>
              <p className="tracking-description">{selectedComplaint.description}</p>

              <dl className="tracking-facts">
                <div><dt>Category</dt><dd>{selectedComplaint.category}</dd></div>
                <div><dt>Location</dt><dd>{selectedComplaint.location}</dd></div>
                <div><dt>Submitted</dt><dd>{selectedComplaint.date}</dd></div>
              </dl>

              <div className="tracking-progress">
                <h3>Complaint progress</h3>
                {['Pending', 'In Progress', 'Resolved'].map((status, index) => {
                  const currentIndex = ['Pending', 'In Progress', 'Resolved'].indexOf(selectedComplaint.status)
                  const completed = index <= currentIndex
                  return (
                    <div className={`progress-step ${completed ? 'complete' : ''}`} key={status}>
                      <span>{completed ? '✓' : index + 1}</span>
                      <div>
                        <strong>{status}</strong>
                        <p>{statusDescriptions[status]}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </aside>
          )}
        </div>
      </section>
    </main>
  )
}

export default TrackComplaint

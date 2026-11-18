import { Link } from 'react-router-dom'

const actions = [
  { to: '/complaints', icon: '+', title: 'Submit New Complaint', text: 'Report a campus issue', tone: 'blue' },
  { to: '/track', icon: '◎', title: 'Track My Complaint', text: 'Check complaint progress', tone: 'purple' },
  { to: '/track', icon: '≡', title: 'View Complaint History', text: 'Browse all submissions', tone: 'green' },
  { to: 'mailto:administration@campusfix.edu', icon: '✉', title: 'Contact Administration', text: 'Send a support request', tone: 'orange' },
]

function QuickActions() {
  return (
    <section className="advanced-quick-actions">
      <div className="advanced-section-heading compact">
        <div>
          <span>Shortcuts</span>
          <h2>Quick Actions</h2>
        </div>
      </div>
      <div className="quick-action-grid">
        {actions.map((action) => (
          action.to.startsWith('mailto:')
            ? <a className={`quick-action-card quick-${action.tone}`} href={action.to} key={action.title}><span>{action.icon}</span><div><strong>{action.title}</strong><small>{action.text}</small></div><b>›</b></a>
            : <Link className={`quick-action-card quick-${action.tone}`} to={action.to} key={action.title}><span>{action.icon}</span><div><strong>{action.title}</strong><small>{action.text}</small></div><b>›</b></Link>
        ))}
      </div>
    </section>
  )
}

export default QuickActions

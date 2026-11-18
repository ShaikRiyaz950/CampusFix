import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  FilePlus2,
  ClipboardList,
  MapPin,
  Bell,
  UserRound,
  Settings2,
  Headset,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Logo from './Logo'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/complaints', label: 'Submit Complaint', icon: FilePlus2 },
  { to: '/track', label: 'My Complaints', icon: ClipboardList },
  { to: '/track', label: 'Track Complaint', icon: MapPin },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings2 },
  { to: '/help', label: 'Help & Support', icon: Headset },
]

function DashboardSidebar({ onCollapseChange }) {
  const [collapsed, setCollapsed] = useState(false)

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value
      onCollapseChange?.(next)
      return next
    })
  }

  return (
    <aside className={`advanced-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="advanced-sidebar-head">
        <Link to="/" className="brand-link"><Logo /></Link>
        <button
          type="button"
          className="sidebar-collapse"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleCollapsed}
        >
          {collapsed
            ? <ChevronRight size={16} aria-hidden="true" />
            : <ChevronLeft size={16} aria-hidden="true" />}
        </button>
      </div>

      <nav className="advanced-sidebar-nav" aria-label="Student dashboard navigation">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <NavLink to={link.to} key={link.label} title={link.label}>
              <span className="advanced-nav-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <span className="advanced-nav-label">{link.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="advanced-sidebar-footer">
        <div className="advanced-user">
          <span className="advanced-avatar">AR</span>
          <span className="advanced-user-copy">
            <strong>Arjun Rao</strong>
            <small>Student</small>
          </span>
        </div>
        <Link to="/login" className="advanced-logout" title="Logout">
          <LogOut size={18} strokeWidth={1.9} aria-hidden="true" />
          <span className="advanced-nav-label">Logout</span>
        </Link>
      </div>
    </aside>
  )
}

export default DashboardSidebar

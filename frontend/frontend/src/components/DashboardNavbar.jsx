import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sun, Moon, Bell, ChevronDown, Menu, UserRound, Settings2, LogOut } from 'lucide-react'

function DashboardNavbar({ onMenuToggle }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('campusfix_theme') || 'light')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const notificationRef = useRef(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('campusfix_theme', theme)
  }, [theme])

  useEffect(() => {
    const closeDropdown = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', closeDropdown)
    return () => document.removeEventListener('mousedown', closeDropdown)
  }, [])

  return (
    <header className="advanced-topbar">
      <button type="button" className="mobile-sidebar-toggle" onClick={onMenuToggle} aria-label="Open dashboard menu">
        <Menu size={20} strokeWidth={1.9} aria-hidden="true" />
      </button>

      <div className="advanced-welcome">
        <span>Wednesday, 18 November</span>
        <h1>Welcome back, Arjun!</h1>
      </div>

      <label className="advanced-search">
        <Search size={17} strokeWidth={1.9} aria-hidden="true" />
        <input type="search" placeholder="Search complaints..." aria-label="Search complaints" />
      </label>

      <div className="advanced-top-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="top-dropdown" ref={notificationRef}>
          <button
            type="button"
            className="notification-button"
            aria-label="Notifications"
            onClick={() => setNotificationOpen((value) => !value)}
          >
            <Bell size={18} strokeWidth={1.9} aria-hidden="true" />
            <span className="notification-badge">2</span>
          </button>
          {notificationOpen && (
            <div className="top-dropdown-menu notification-menu" role="status">
              <strong>Notifications</strong>
              <p>Your complaint CF-1024 is now in progress.</p>
              <p>CF-1021 was marked as resolved.</p>
            </div>
          )}
        </div>

        <div className="top-dropdown profile-dropdown">
          <button
            type="button"
            className="profile-trigger"
            aria-label="Open profile menu"
            onClick={() => setProfileOpen((value) => !value)}
          >
            <span className="advanced-avatar">AR</span>
            <span className="profile-trigger-copy">
              <strong>Arjun</strong>
              <small>Student</small>
            </span>
            <ChevronDown size={15} strokeWidth={1.9} aria-hidden="true" />
          </button>
          {profileOpen && (
            <div className="top-dropdown-menu profile-menu">
              <Link to="/profile"><UserRound size={15} /> View profile</Link>
              <Link to="/settings"><Settings2 size={15} /> Settings</Link>
              <Link to="/login"><LogOut size={15} /> Logout</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default DashboardNavbar

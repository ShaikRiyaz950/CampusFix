import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import Logo from './Logo'
import Button from './Button'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('campusfix_theme') === 'dark')
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 24)
    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })

    const sections = ['home', 'about', 'features', 'contact']
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveSection(visible.target.id)
    }, { rootMargin: '-20% 0px -65% 0px', threshold: [0.05, 0.25, 0.5] })
    sections.forEach((section) => observer.observe(section))

    return () => {
      window.removeEventListener('scroll', updateScroll)
      observer.disconnect()
    }
  }, [])

  const toggleTheme = () => {
    setDarkMode((current) => {
      const next = !current
      document.documentElement.dataset.theme = next ? 'dark' : 'light'
      localStorage.setItem('campusfix_theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="nav-container">
        <Link to="/" className="brand-link" onClick={closeMenu}><Logo /></Link>
        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
        <nav className={`nav-menu ${menuOpen ? 'nav-menu-open' : ''}`} aria-label="Main navigation">
          <a href="#home" className={activeSection === 'home' ? 'active' : ''} onClick={closeMenu}>Home</a>
          <NavLink to="/dashboard" onClick={closeMenu}>Dashboard</NavLink>
          <NavLink to="/complaints" onClick={closeMenu}>Complaints</NavLink>
          <NavLink to="/track" onClick={closeMenu}>Track</NavLink>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#about" className={activeSection === 'about' ? 'active' : ''} onClick={closeMenu}>About</a>
        </nav>
        <div className="nav-actions">
          <button
            type="button"
            className="theme-toggle"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={darkMode}
            onClick={toggleTheme}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <Link to="/login" className="login-link">Log in</Link>
          <Button to="/register" variant="primary" className="nav-register">Register</Button>
        </div>
      </div>
    </header>
  )
}

export default Navbar

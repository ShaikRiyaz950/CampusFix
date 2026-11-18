import { Link } from 'react-router-dom'
import Logo from './Logo'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand-link" aria-label="CampusFix home"><Logo /></Link>
          <p>Making campus life better, one resolved complaint at a time.</p>
        </div>
        <div className="footer-links">
          <h3>Quick links</h3>
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/complaints">Submit complaint</Link>
          <Link to="/track">Track complaint</Link>
        </div>
        <div className="footer-links">
          <h3>Support</h3>
          <Link to="/about">About us</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/help">Help center</Link>
        </div>
        <div className="footer-links">
          <h3>Account</h3>
          <Link to="/login">Log in</Link>
          <Link to="/register">Create account</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} CampusFix. All rights reserved.</p>
        <div><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
      </div>
    </footer>
  )
}

export default Footer

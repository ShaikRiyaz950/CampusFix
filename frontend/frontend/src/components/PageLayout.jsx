import Navbar from './Navbar'
import Footer from './Footer'

function PageLayout({ children, mainClassName = '' }) {
  return (
    <div className="page-shell">
      <Navbar />
      <main className={`page-main ${mainClassName}`}>{children}</main>
      <Footer />
    </div>
  )
}

export default PageLayout

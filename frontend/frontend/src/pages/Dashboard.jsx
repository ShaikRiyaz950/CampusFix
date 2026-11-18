import { useState } from 'react'
import DashboardSidebar from '../components/DashboardSidebar'
import DashboardNavbar from '../components/DashboardNavbar'
import StatCard from '../components/StatCard'
import Carousel from '../components/Carousel'
import ComplaintAnalytics from '../components/ComplaintAnalytics'
import RecentComplaints from '../components/RecentComplaints'
import QuickActions from '../components/QuickActions'
import ScrollReveal from '../components/ScrollReveal'
import { Files, Clock3, RefreshCw, CircleCheck } from 'lucide-react'

const statistics = [
  { label: 'Total Complaints', value: 12, icon: Files, tone: 'blue' },
  { label: 'Pending Complaints', value: 3, icon: Clock3, tone: 'orange' },
  { label: 'In Progress', value: 4, icon: RefreshCw, tone: 'purple' },
  { label: 'Resolved Complaints', value: 5, icon: CircleCheck, tone: 'green' },
]

function Dashboard() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <main className={`advanced-dashboard ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className={mobileMenuOpen ? 'advanced-sidebar-backdrop open' : 'advanced-sidebar-backdrop'} onClick={() => setMobileMenuOpen(false)} />
      <div className={mobileMenuOpen ? 'advanced-sidebar-wrap open' : 'advanced-sidebar-wrap'}>
        <DashboardSidebar onCollapseChange={setSidebarCollapsed} />
      </div>

      <section className="advanced-dashboard-main">
        <DashboardNavbar onMenuToggle={() => setMobileMenuOpen((value) => !value)} />

        <div className="advanced-dashboard-content">
          <ScrollReveal>
            <section className="advanced-stat-grid" aria-label="Complaint statistics">
              {statistics.map((card) => <StatCard key={card.label} {...card} />)}
            </section>
          </ScrollReveal>

          <ScrollReveal direction="left" delay={0.05}><Carousel /></ScrollReveal>
          <ScrollReveal direction="right" delay={0.08}><ComplaintAnalytics /></ScrollReveal>
          <ScrollReveal direction="up" delay={0.06}><QuickActions /></ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}><RecentComplaints /></ScrollReveal>
        </div>
      </section>
    </main>
  )
}

export default Dashboard

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const statusData = [
  { name: 'Pending', value: 3, color: '#F6B65B' },
  { name: 'In Progress', value: 4, color: '#8056A8' },
  { name: 'Resolved', value: 5, color: '#FF7043' },
]

const categoryData = [
  { category: 'Water', complaints: 3 },
  { category: 'Electric', complaints: 2 },
  { category: 'Clean', complaints: 4 },
  { category: 'Classroom', complaints: 2 },
  { category: 'Other', complaints: 1 },
]

function ComplaintAnalytics() {
  return (
    <section className="advanced-analytics">
      <div className="advanced-section-heading">
        <div>
          <span>Performance overview</span>
          <h2>Complaint Analytics</h2>
        </div>
      </div>
      <div className="analytics-grid">
        <article className="analytics-card">
          <div className="analytics-card-head">
            <h3>Status distribution</h3>
            <span>12 total</span>
          </div>
          <div className="pie-chart-wrap">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4}>
                  {statusData.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {statusData.map((item) => (
              <span key={item.name}><i style={{ background: item.color }} />{item.name}<strong>{item.value}</strong></span>
            ))}
          </div>
        </article>

        <article className="analytics-card bar-card">
          <div className="analytics-card-head">
            <h3>Complaints by category</h3>
            <span>This semester</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="category" tick={{ fill: '#8891a4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#8891a4', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(36,107,253,0.05)' }} />
              <Bar dataKey="complaints" fill="url(#barGradient)" radius={[8, 8, 2, 2]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF7043" />
                  <stop offset="100%" stopColor="#8056A8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  )
}

export default ComplaintAnalytics

import { useState } from 'react'
import { Link } from 'react-router-dom'

const complaints = [
  { id: 'CF-1024', title: 'Drinking water issue', category: 'Drinking water', date: '18 Nov 2026', status: 'In Progress', location: 'Science Block, Floor 2' },
  { id: 'CF-1021', title: 'Library fan not working', category: 'Electricity', date: '16 Nov 2026', status: 'Resolved', location: 'Central Library' },
  { id: 'CF-1018', title: 'Classroom desk damaged', category: 'Classroom', date: '14 Nov 2026', status: 'Pending', location: 'Academic Block B, Room 204' },
  { id: 'CF-1015', title: 'Corridor cleaning request', category: 'Cleanliness', date: '12 Nov 2026', status: 'Resolved', location: 'Main Corridor' },
]

function RecentComplaints() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [category, setCategory] = useState('All')

  const filtered = complaints.filter((complaint) => {
    const matchesSearch = `${complaint.id} ${complaint.title}`.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = status === 'All' || complaint.status === status
    const matchesCategory = category === 'All' || complaint.category === category
    return matchesSearch && matchesStatus && matchesCategory
  })

  return (
    <article className="recent-complaints advanced-recent">
      <div className="advanced-section-heading compact">
        <div>
          <span>Latest activity</span>
          <h2>Recent Complaints</h2>
        </div>
        <Link to="/track">View all</Link>
      </div>

      <div className="table-tools">
        <label>
          <span>Search</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID or title" />
        </label>
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>All</option>
            <option>Drinking water</option>
            <option>Electricity</option>
            <option>Classroom</option>
            <option>Cleanliness</option>
          </select>
        </label>
      </div>

      <div className="advanced-table-wrap">
        <table className="advanced-table">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Title</th>
              <th>Category</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((complaint) => (
              <tr key={complaint.id}>
                <td data-label="Complaint ID"><strong>{complaint.id}</strong></td>
                <td data-label="Title"><strong>{complaint.title}</strong><small>{complaint.location}</small></td>
                <td data-label="Category">{complaint.category}</td>
                <td data-label="Date">{complaint.date}</td>
                <td data-label="Status">
                  <span className={`advanced-status status-${complaint.status.toLowerCase().replaceAll(' ', '-')}`}>
                    {complaint.status}
                  </span>
                </td>
                <td data-label="Action"><Link to="/track" className="table-view-button">View details</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="advanced-empty">No complaints match these filters.</div>}
      </div>
    </article>
  )
}

export default RecentComplaints

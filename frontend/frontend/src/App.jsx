import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PageLayout from './components/PageLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SubmitComplaint from './pages/SubmitComplaint'
import TrackComplaint from './pages/TrackComplaint'
import ScrollEffects from './components/ScrollEffects'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <ScrollEffects />
      <Routes>
        <Route path="/" element={<PageLayout><Home /></PageLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/complaints" element={<SubmitComplaint />} />
        <Route path="/track" element={<TrackComplaint />} />
        <Route path="*" element={<PageLayout><Home /></PageLayout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

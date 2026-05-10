import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSocketStore } from './store/socketStore'
import Shell from './pages/Shell'
import Process from './pages/Process'
import Kernel from './pages/Kernel'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'

function MainLayout({ children }) {
  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { connect, disconnect } = useSocketStore()

  useEffect(() => {
    // Connect to Socket.IO without token
    connect(null)

    return () => {
      disconnect()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/shell"
          element={
            <MainLayout>
              <Shell />
            </MainLayout>
          }
        />
        <Route
          path="/process"
          element={
            <MainLayout>
              <Process />
            </MainLayout>
          }
        />
        <Route
          path="/kernel"
          element={
            <MainLayout>
              <Kernel />
            </MainLayout>
          }
        />
        <Route path="/" element={<Navigate to="/shell" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

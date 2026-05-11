import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSocketStore } from './store/socketStore'
import Shell from './pages/Shell'
import Process from './pages/Process'
import Kernel from './pages/Kernel'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import ErrorBoundary from './components/UI/ErrorBoundary'

function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#050608]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-[#050608]">
          {children}
        </main>
      </div>
    </div>
  )
}

function AppContent() {
  const { connect, disconnect } = useSocketStore()

  useEffect(() => {
    connect(null)
    return () => disconnect()
  }, [])

  return (
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
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050608] flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-md w-full bg-red-500/5 border border-red-500/20 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle size={40} className="text-red-400" />
            </div>
            <h1 className="text-xl font-bold mb-2 tracking-tight">System Fault Detected</h1>
            <p className="text-sm text-white/40 mb-8 leading-relaxed">
              A critical UI exception occurred. The interface has been halted to prevent data corruption.
            </p>
            
            <div className="bg-black/40 rounded-2xl p-4 mb-8 text-left border border-white/5 overflow-hidden">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Technical Details</p>
              <p className="text-[11px] font-mono text-white/60 break-words leading-relaxed">
                {this.state.error?.message || 'Unknown runtime error'}
              </p>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-400 transition-all shadow-lg shadow-red-500/20"
            >
              <RefreshCw size={18} />
              Reboot Interface
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

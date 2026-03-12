import { Outlet } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import Sidebar from './Sidebar'
import { useCRM } from '../context/CRMContext'

export default function Layout() {
  const { loading, error } = useCRM()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-brand-500" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="card p-8 max-w-sm text-center">
          <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Failed to load data</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary mt-4 text-xs">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  )
}

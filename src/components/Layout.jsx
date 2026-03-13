import { Outlet } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Loader2, AlertCircle, RotateCcw, X } from 'lucide-react'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import { useCRM } from '../context/CRMContext'

export default function Layout() {
  const { loading, error, undoStack, undoLastDelete, dismissUndo } = useCRM()
  const toastTimerRef = useRef(null)
  const toast = undoStack[0] ?? null

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (toast) {
      toastTimerRef.current = setTimeout(() => dismissUndo(), 5000)
    }
    return () => clearTimeout(toastTimerRef.current)
  }, [toast?.type, toast?.id, toast?.label]) // eslint-disable-line

  // Global Ctrl+Z listener
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const active = document.activeElement
        const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
        if (!isInput && undoStack.length > 0) {
          e.preventDefault()
          undoLastDelete()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undoStack, undoLastDelete])

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
        <div className="flex justify-end px-8 pt-4">
          <GlobalSearch />
        </div>
        <Outlet />
      </main>

      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-gray-800 dark:bg-gray-700 text-white text-sm animate-fade-in">
          <span className="text-gray-300">
            <span className="font-medium text-white capitalize">{toast.label}</span> deleted
          </span>
          <button
            onClick={() => { clearTimeout(toastTimerRef.current); undoLastDelete() }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors font-medium text-white"
          >
            <RotateCcw size={13} />
            Undo
            <kbd className="text-[10px] text-gray-400 ml-0.5">Ctrl+Z</kbd>
          </button>
          <button
            onClick={() => { clearTimeout(toastTimerRef.current); dismissUndo() }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

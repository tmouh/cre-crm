import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, size = 'md', disableBackdropClose = false }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT' || active.isContentEditable)) {
        active.blur()
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, disableBackdropClose])

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-3xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={disableBackdropClose ? undefined : onClose} />
      <div className={`relative bg-white dark:bg-surface-50 border border-[var(--border)] w-full ${widths[size]} max-h-[90vh] flex flex-col animate-scale-in`}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-surface-50 dark:bg-surface-100">
          <h2 className="text-[12px] font-bold text-slate-800 dark:text-white font-mono uppercase tracking-wide">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3">{children}</div>
      </div>
    </div>
  )
}

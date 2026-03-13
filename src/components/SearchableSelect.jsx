import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Plus, Loader2 } from 'lucide-react'

export default function SearchableSelect({ value, onChange, options, placeholder = 'Search...', onCreate, createLabel = 'Create' }) {
  // options: [{ id, label }]
  const [inputText, setInputText] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const match = options.find(o => o.id === value)
    setInputText(match ? match.label : '')
  }, [value, options])

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = options
    .filter(o => o.label.toLowerCase().includes(inputText.toLowerCase()))
    .slice(0, 8)

  const hasExactMatch = options.some(o => o.label.toLowerCase() === inputText.toLowerCase())
  const showCreate = onCreate && inputText.trim().length > 0 && !hasExactMatch

  async function handleCreate() {
    if (!inputText.trim()) return
    setCreating(true)
    try {
      await onCreate(inputText.trim())
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  function handleSelect(opt) {
    onChange(opt.id)
    setInputText(opt.label)
    setOpen(false)
  }

  function handleClear() {
    onChange('')
    setInputText('')
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={e => { setInputText(e.target.value); setOpen(true); if (!e.target.value) handleClear() }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); e.target.blur() } }}
          className="input pr-8"
          placeholder={placeholder}
        />
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2.5 text-sm text-slate-400 dark:text-slate-500">No results found</p>
          )}
          {filtered.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => handleSelect(o)}
              className="w-full text-left px-3 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
            >
              {o.label}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full text-left px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-700"
            >
              {creating
                ? <><Loader2 size={13} className="animate-spin" /> Creating...</>
                : <><Plus size={13} /> {createLabel} "{inputText.trim()}"</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  )
}

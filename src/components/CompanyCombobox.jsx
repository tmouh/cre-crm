import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Plus, Loader2 } from 'lucide-react'
import { useCRM } from '../context/CRMContext'

export default function CompanyCombobox({ value, onChange, onCreateAndSelect }) {
  const { companies } = useCRM()
  const [inputText, setInputText] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapRef = useRef(null)

  // Sync inputText with value prop (e.g. when editing an existing contact)
  useEffect(() => {
    const match = companies.find(c => c.id === value)
    setInputText(match ? match.name : '')
  }, [value, companies])

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = [...companies]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(c => c.name.toLowerCase().includes(inputText.toLowerCase()))
    .slice(0, 8)

  const hasExactMatch = companies.some(
    c => c.name.toLowerCase() === inputText.toLowerCase()
  )
  const showCreate = inputText.trim().length > 0 && !hasExactMatch

  async function handleCreate() {
    if (!inputText.trim()) return
    setCreating(true)
    try {
      await onCreateAndSelect(inputText.trim())
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  function handleSelect(company) {
    onChange(company.id)
    setInputText(company.name)
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
          placeholder="Search or create company..."
        />
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500">No companies found</p>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
            >
              {c.name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full text-left px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-700"
            >
              {creating
                ? <><Loader2 size={13} className="animate-spin" /> Creating…</>
                : <><Plus size={13} /> Create "{inputText.trim()}"</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  )
}

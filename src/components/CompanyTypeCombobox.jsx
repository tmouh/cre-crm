import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { COMPANY_TYPES, COMPANY_TYPE_COLORS } from '../utils/helpers'

export default function CompanyTypeCombobox({ value, onChange, disabled }) {
  const { companies } = useCRM()
  const [inputText, setInputText] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Build the full list of types: defaults + any custom ones from existing companies
  const allTypes = [...new Set([
    ...COMPANY_TYPES,
    ...companies.map(c => c.type).filter(Boolean),
  ])].sort((a, b) => {
    // Keep built-in types first, then alphabetical
    const aBuiltin = COMPANY_TYPES.includes(a)
    const bBuiltin = COMPANY_TYPES.includes(b)
    if (aBuiltin && !bBuiltin) return -1
    if (!aBuiltin && bBuiltin) return 1
    return a.localeCompare(b)
  })

  // Sync input text with value prop
  useEffect(() => {
    setInputText(value || '')
  }, [value])

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = allTypes.filter(t =>
    t.toLowerCase().includes(inputText.toLowerCase())
  )

  const hasExactMatch = allTypes.some(
    t => t.toLowerCase() === inputText.trim().toLowerCase()
  )
  const showCreate = inputText.trim().length > 0 && !hasExactMatch

  function handleSelect(type) {
    onChange(type)
    setInputText(type)
    setOpen(false)
  }

  function handleCreate() {
    const newType = inputText.trim().toLowerCase().replace(/\s+/g, '-')
    if (!newType) return
    onChange(newType)
    setInputText(newType)
    setOpen(false)
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputText ? capitalize(inputText) : ''}
          onChange={e => { setInputText(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="input pr-8"
          placeholder="Search or create type..."
          disabled={disabled}
        />
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500">No types found</p>
          )}
          {filtered.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => handleSelect(t)}
              className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 flex items-center gap-2"
            >
              <span className={clsx('badge text-[10px]', COMPANY_TYPE_COLORS[t] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                {capitalize(t)}
              </span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="w-full text-left px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-700"
            >
              <Plus size={13} /> Create "{inputText.trim().toLowerCase().replace(/\s+/g, '-')}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

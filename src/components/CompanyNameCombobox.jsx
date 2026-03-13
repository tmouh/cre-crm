import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Plus, Loader2, Building2 } from 'lucide-react'
import { useCRM } from '../context/CRMContext'

/**
 * Combobox for buyer/seller fields that stores a TEXT name (not a company ID).
 * - Searches existing companies by name
 * - Selecting a company puts its name in the field
 * - Typing a new name shows "Add [name] to companies" option
 * - User can also just type a name without creating a company — only the text is saved
 */
export default function CompanyNameCombobox({ value, onChange, placeholder = 'Search companies or type name...' }) {
  const { companies, addCompany } = useCRM()
  const [inputText, setInputText] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapRef = useRef(null)

  // Sync when value changes externally (e.g. editing existing comp)
  useEffect(() => {
    setInputText(value || '')
  }, [value])

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        // Commit whatever text is typed
        if (inputText !== value) onChange(inputText)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [inputText, value, onChange])

  const sorted = [...companies].sort((a, b) => a.name.localeCompare(b.name))
  const filtered = sorted
    .filter(c => c.name.toLowerCase().includes(inputText.toLowerCase()))
    .slice(0, 8)

  const hasExactMatch = companies.some(
    c => c.name.toLowerCase() === inputText.trim().toLowerCase()
  )
  const showCreate = inputText.trim().length > 0 && !hasExactMatch

  function handleSelect(company) {
    setInputText(company.name)
    onChange(company.name)
    setOpen(false)
  }

  async function handleCreate() {
    if (!inputText.trim()) return
    setCreating(true)
    try {
      await addCompany({ name: inputText.trim(), type: 'other' })
      onChange(inputText.trim())
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  function handleInputChange(e) {
    const val = e.target.value
    setInputText(val)
    setOpen(true)
    onChange(val)
  }

  function handleClear() {
    setInputText('')
    onChange('')
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); e.target.blur() }
          }}
          className="v-input pr-8"
          placeholder={placeholder}
        />
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>

      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-surface-100 border border-[var(--border)] overflow-hidden max-h-56 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 flex items-center gap-2"
            >
              <Building2 size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              {c.name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={handleCreate}
              disabled={creating}
              className="w-full text-left px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center gap-1.5 border-t border-[var(--border)]"
            >
              {creating
                ? <><Loader2 size={13} className="animate-spin" /> Adding to companies...</>
                : <><Plus size={13} /> Add "{inputText.trim()}" to companies</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  )
}

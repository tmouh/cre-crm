import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useCRM } from '../context/CRMContext'
import { CONTACT_FUNCTIONS, formatContactFunction } from '../utils/helpers'

function toSlug(text) {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function FunctionCombobox({ value, onChange }) {
  const { contacts, customOptions, addCustomOption } = useCRM()
  const [inputText, setInputText] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Build merged, deduplicated, alphabetical list of all functions
  const allFunctions = useMemo(() => {
    const set = new Set(CONTACT_FUNCTIONS)
    // Custom options saved in Supabase for this field
    for (const opt of (customOptions || [])) {
      if (opt.field === 'contactFunction') set.add(opt.value)
    }
    // Any values already used on existing contacts
    for (const c of (contacts || [])) {
      if (c.contactFunction) set.add(c.contactFunction)
    }
    return [...set].sort((a, b) => formatContactFunction(a).localeCompare(formatContactFunction(b)))
  }, [contacts, customOptions])

  // Sync input text with current value
  useEffect(() => {
    setInputText(value ? formatContactFunction(value) : '')
  }, [value])

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = allFunctions
    .filter(slug => formatContactFunction(slug).toLowerCase().includes(inputText.toLowerCase()))
    .slice(0, 10)

  const trimmed = inputText.trim()
  const slug = toSlug(trimmed)
  const hasExactMatch = allFunctions.some(
    s => formatContactFunction(s).toLowerCase() === trimmed.toLowerCase()
  )
  const showCreate = trimmed.length > 0 && slug.length > 0 && !hasExactMatch

  function handleSelect(fnSlug) {
    onChange(fnSlug)
    setInputText(formatContactFunction(fnSlug))
    setOpen(false)
  }

  async function handleCreate() {
    if (!slug) return
    await addCustomOption('contactFunction', slug)
    onChange(slug)
    setInputText(formatContactFunction(slug))
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
          className="v-input pr-8"
          placeholder="Search or create..."
        />
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-surface-100 border border-[var(--border)] overflow-hidden max-h-48 overflow-y-auto">
          {filtered.length === 0 && !showCreate && (
            <p className="px-3 py-2.5 text-sm text-slate-400 dark:text-slate-500">No functions found</p>
          )}
          {filtered.map(slug => (
            <button
              key={slug}
              type="button"
              onClick={() => handleSelect(slug)}
              className="w-full text-left px-3 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300"
            >
              {formatContactFunction(slug)}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="w-full text-left px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center gap-1.5 border-t border-[var(--border)]"
            >
              <Plus size={13} /> Create &ldquo;{trimmed}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  )
}

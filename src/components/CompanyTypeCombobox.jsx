import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { COMPANY_TYPES, COMPANY_TYPE_COLORS } from '../utils/helpers'

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function CompanyTypeCombobox({ value, onChange, disabled }) {
  const { companies } = useCRM()
  const [inputText, setInputText] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const wrapRef = useRef(null)

  // Build the full list of types: defaults + any custom ones from existing companies
  const allTypes = [...new Set([
    ...COMPANY_TYPES,
    ...companies.map(c => c.type).filter(Boolean),
  ])].sort((a, b) => {
    if (a === 'other' && b !== 'other') return 1
    if (b === 'other' && a !== 'other') return -1
    const aBuiltin = COMPANY_TYPES.includes(a)
    const bBuiltin = COMPANY_TYPES.includes(b)
    if (aBuiltin && !bBuiltin) return -1
    if (!aBuiltin && bBuiltin) return 1
    return a.localeCompare(b)
  })

  // Sync input text with value prop (only when not actively editing)
  useEffect(() => {
    if (!isEditing) {
      setInputText(value || '')
    }
  }, [value, isEditing])

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setIsEditing(false)
        // Reset to current value if user didn't pick anything
        setInputText(value || '')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  const query = inputText.toLowerCase().trim()

  const filtered = allTypes.filter(t =>
    t.toLowerCase().includes(query)
  )

  const hasExactMatch = allTypes.some(
    t => t.toLowerCase() === query
  )
  const normalizedNew = query.replace(/\s+/g, '-')
  const showCreate = normalizedNew.length > 0 && !hasExactMatch

  function handleSelect(type) {
    onChange(type)
    setInputText(type)
    setOpen(false)
    setIsEditing(false)
  }

  function handleCreate() {
    if (!normalizedNew) return
    onChange(normalizedNew)
    setInputText(normalizedNew)
    setOpen(false)
    setIsEditing(false)
  }

  // Display value: capitalize, but only when not actively typing
  const displayValue = isEditing ? inputText : capitalize(inputText)

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={e => {
            setInputText(e.target.value)
            setIsEditing(true)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setIsEditing(true)
          }}
          onBlur={() => {
            // Small delay to allow click events on dropdown items to fire first
            setTimeout(() => {
              setIsEditing(false)
            }, 200)
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setOpen(false)
              setIsEditing(false)
              setInputText(value || '')
              e.target.blur()
            }
          }}
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
              onMouseDown={e => e.preventDefault()}
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
              onMouseDown={e => e.preventDefault()}
              onClick={handleCreate}
              className="w-full text-left px-3 py-2 text-sm text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-700"
            >
              <Plus size={13} /> Create "{normalizedNew}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

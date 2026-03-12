import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export default function AddressAutocomplete({ value, onChange, placeholder = 'Property address', required = false }) {
  const [inputText, setInputText] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => { setInputText(value || '') }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = useCallback(async (text) => {
    if (!text.trim() || text.length < 3) {
      setSuggestions([])
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: text,
        format: 'json',
        addressdetails: '1',
        countrycodes: 'us',
        limit: '5',
      })
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSuggestions(data)
    } catch (err) {
      if (err.name !== 'AbortError') setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInputChange(e) {
    const text = e.target.value
    setInputText(text)
    onChange(text)
    setActiveIdx(-1)

    clearTimeout(debounceRef.current)
    if (text.length >= 3) {
      setOpen(true)
      debounceRef.current = setTimeout(() => fetchSuggestions(text), 150)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  function handleSelect(item) {
    const addr = formatAddress(item)
    setInputText(addr)
    onChange(addr)
    setSuggestions([])
    setOpen(false)
    setActiveIdx(-1)
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => (i < suggestions.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => (i > 0 ? i - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
    }
  }

  function stateAbbr(state) {
    const map = {
      'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO',
      'Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID',
      'Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA',
      'Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS',
      'Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ',
      'New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
      'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
      'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA',
      'West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','District of Columbia':'DC',
    }
    return map[state] || state || ''
  }

  function formatAddress(item) {
    const a = item.address || {}
    const street = [a.house_number, a.road].filter(Boolean).join(' ')
    const city = a.city || a.town || a.village || ''
    const state = stateAbbr(a.state)
    const zip = a.postcode || ''
    return [street, city, state, zip].filter(Boolean).join(', ')
  }

  function formatSuggestion(item) {
    const a = item.address || {}
    const street = [a.house_number, a.road].filter(Boolean).join(' ')
    const city = a.city || a.town || a.village || ''
    const state = stateAbbr(a.state)
    return { main: street || item.display_name.split(',')[0], secondary: [city, state].filter(Boolean).join(', ') }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
          className="input pl-8"
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        <MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        {loading && (
          <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((item, i) => {
            const { main, secondary } = formatSuggestion(item)
            return (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3 py-2 text-sm flex items-start gap-2 transition-colors ${
                  i === activeIdx
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300'
                    : 'text-gray-800 dark:text-gray-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300'
                }`}
              >
                <MapPin size={13} className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-medium">{main}</span>
                  {secondary && <span className="text-gray-500 dark:text-gray-400"> {secondary}</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

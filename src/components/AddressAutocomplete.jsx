import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

let googleScriptLoaded = false
let googleScriptLoading = false
const loadCallbacks = []

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return }
    if (googleScriptLoaded) { resolve(); return }
    loadCallbacks.push({ resolve, reject })
    if (googleScriptLoading) return
    googleScriptLoading = true

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) { reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY')); return }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.onload = () => {
      googleScriptLoaded = true
      googleScriptLoading = false
      loadCallbacks.forEach(cb => cb.resolve())
      loadCallbacks.length = 0
    }
    script.onerror = () => {
      googleScriptLoading = false
      const err = new Error('Failed to load Google Maps')
      loadCallbacks.forEach(cb => cb.reject(err))
      loadCallbacks.length = 0
    }
    document.head.appendChild(script)
  })
}

export default function AddressAutocomplete({ value, onChange, placeholder = 'Property address', required = false }) {
  const [inputText, setInputText] = useState(value || '')
  const [predictions, setPredictions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)
  const serviceRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => { setInputText(value || '') }, [value])

  useEffect(() => {
    loadGoogleMaps().then(() => {
      serviceRef.current = new window.google.maps.places.AutocompleteService()
      setReady(true)
    }).catch(() => {})
  }, [])

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

  const fetchPredictions = useCallback((text) => {
    if (!serviceRef.current || !text.trim() || text.length < 3) {
      setPredictions([])
      setLoading(false)
      return
    }
    setLoading(true)
    serviceRef.current.getPlacePredictions(
      { input: text, types: ['address'], componentRestrictions: { country: 'us' } },
      (results, status) => {
        setLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results.slice(0, 5))
        } else {
          setPredictions([])
        }
      }
    )
  }, [])

  function handleInputChange(e) {
    const text = e.target.value
    setInputText(text)
    onChange(text)
    setActiveIdx(-1)

    clearTimeout(debounceRef.current)
    if (ready && text.length >= 3) {
      setOpen(true)
      debounceRef.current = setTimeout(() => fetchPredictions(text), 250)
    } else {
      setPredictions([])
      setOpen(false)
    }
  }

  function handleSelect(prediction) {
    const desc = prediction.description
    setInputText(desc)
    onChange(desc)
    setPredictions([])
    setOpen(false)
    setActiveIdx(-1)
  }

  function handleKeyDown(e) {
    if (!open || predictions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => (i < predictions.length - 1 ? i + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => (i > 0 ? i - 1 : predictions.length - 1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(predictions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (predictions.length > 0) setOpen(true) }}
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

      {open && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
          {predictions.map((p, i) => {
            const main = p.structured_formatting?.main_text || ''
            const secondary = p.structured_formatting?.secondary_text || ''
            return (
              <button
                key={p.place_id}
                type="button"
                onClick={() => handleSelect(p)}
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

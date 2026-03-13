import { useState, useEffect } from 'react'

// Numeric input that shows raw value while focused (so cursor works naturally)
// and formats with commas on blur.
// Props:
//   value      – raw numeric string stored in form state
//   onChange   – called with raw numeric string (no commas)
//   decimals   – if true, formats to 2 decimal places on blur
//   className, placeholder, inputMode
export default function NumericInput({ value, onChange, decimals = false, className = 'v-input', placeholder = '0', inputMode }) {
  const [display, setDisplay] = useState('')
  const [focused, setFocused] = useState(false)

  // Sync display when value changes externally (e.g. form reset) and not focused
  useEffect(() => {
    if (!focused) setDisplay(format(value))
  }, [value, focused])

  function format(val) {
    if (!val && val !== 0) return ''
    const n = Number(val)
    if (isNaN(n)) return ''
    if (decimals) {
      return n.toLocaleString(undefined, { minimumFractionDigits: String(val).includes('.') ? 2 : 0, maximumFractionDigits: 2 })
    }
    return n.toLocaleString()
  }

  function handleFocus() {
    setFocused(true)
    setDisplay(value || '') // raw, no commas — cursor positions correctly
  }

  function handleBlur() {
    setFocused(false)
    setDisplay(format(value)) // reformat with commas
  }

  function handleChange(e) {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setDisplay(e.target.value) // let user see exactly what they type
    onChange(raw)
  }

  return (
    <input
      type="text"
      inputMode={inputMode || (decimals ? 'decimal' : 'numeric')}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder}
    />
  )
}

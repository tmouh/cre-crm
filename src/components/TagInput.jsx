import { useState } from 'react'
import { X } from 'lucide-react'

export default function TagInput({ tags = [], onChange }) {
  const [input, setInput] = useState('')

  function add(val) {
    const tag = val.trim().toLowerCase().replace(/\s+/g, '-')
    if (tag && !tags.includes(tag)) onChange([...tags, tag])
    setInput('')
  }

  function remove(tag) {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div className="flex flex-wrap gap-1 p-1.5 border border-[var(--border)] min-h-[34px] focus-within:ring-1 focus-within:ring-brand-500 focus-within:border-transparent bg-white dark:bg-surface-100">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-[10px] font-mono">
          {tag}
          <button type="button" onClick={() => remove(tag)} className="hover:text-brand-900 dark:hover:text-brand-100">
            <X size={9} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
          if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1])
        }}
        onBlur={() => input && add(input)}
        placeholder={tags.length === 0 ? 'Add tags...' : ''}
        className="flex-1 min-w-[80px] text-[12px] outline-none bg-transparent placeholder-slate-400 dark:placeholder-slate-500 dark:text-slate-100"
      />
    </div>
  )
}

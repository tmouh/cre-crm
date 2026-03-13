import { useState, useMemo, useRef, useEffect } from 'react'
import { Bell, CheckCircle2, Trash2, Plus, Edit3, Clock, Filter, ChevronRight, ChevronDown, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { addDays } from 'date-fns'
import { useCRM } from '../context/CRMContext'
import {
  formatDate, isOverdue, isDueToday, relativeTimeLabel, priorityWeight,
  PRIORITY_COLORS, TYPE_COLORS, REMINDER_TYPES, PRIORITIES, SNOOZE_OPTIONS
} from '../utils/helpers'

const PRIORITY_DOTS = {
  high:   'bg-red-500',
  medium: 'bg-yellow-400',
  low:    'bg-slate-300 dark:bg-slate-600',
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

function ReminderRow({ reminder, onComplete, onUncomplete, onDelete, onEdit, onSnooze }) {
  const [showSnooze, setShowSnooze] = useState(false)
  const snoozeRef = useRef(null)
  const overdue = isOverdue(reminder.dueDate)
  const today = isDueToday(reminder.dueDate)
  const done = reminder.status === 'done'

  useEffect(() => {
    function h(e) { if (snoozeRef.current && !snoozeRef.current.contains(e.target)) setShowSnooze(false) }
    if (showSnooze) { document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }
  }, [showSnooze])

  return (
    <div className={clsx(
      'flex items-start gap-2.5 px-3 py-2 group transition-colors',
      !done && 'hover:bg-surface-50 dark:hover:bg-surface-100'
    )}>
      {/* Priority dot */}
      <div className={clsx('flex flex-col items-center gap-1 pt-1.5 flex-shrink-0', done && 'opacity-40')}>
        <div className={clsx('w-2 h-2 rounded-full', PRIORITY_DOTS[reminder.priority] || PRIORITY_DOTS.medium)} />
      </div>

      {/* Content */}
      <div className={clsx('flex-1 min-w-0', done && 'opacity-40')}>
        <p className={clsx('text-sm font-medium text-slate-800 dark:text-slate-200', done && 'line-through text-slate-400 dark:text-slate-500 font-normal')}>
          {reminder.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={clsx('v-badge text-[10px]',
            overdue && !done ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
            today && !done ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
            'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
          )}>
            {done ? formatDate(reminder.dueDate) : relativeTimeLabel(reminder.dueDate)}
          </span>
          <span className={clsx('v-badge text-[10px]', TYPE_COLORS[reminder.type] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
            {capitalize(reminder.type)}
          </span>
        </div>
        {reminder.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">{reminder.notes}</p>}
      </div>

      {/* Actions */}
      {!done && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onComplete(reminder.id)} className="p-1.5 text-slate-400 hover:text-green-500 dark:text-slate-500 dark:hover:text-green-400 transition-colors" title="Complete">
            <CheckCircle2 size={14} />
          </button>
          <button onClick={() => onEdit(reminder)} className="p-1.5 text-slate-400 hover:text-brand-500 dark:text-slate-500 dark:hover:text-brand-400 transition-colors" title="Edit">
            <Edit3 size={13} />
          </button>
          <div className="relative" ref={snoozeRef}>
            <button onClick={() => setShowSnooze(v => !v)} className="p-1.5 text-slate-400 hover:text-orange-500 dark:text-slate-500 dark:hover:text-orange-400 transition-colors" title="Snooze">
              <Clock size={13} />
            </button>
            {showSnooze && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-white dark:bg-surface-100 border border-[var(--border)] py-1 w-36">
                {SNOOZE_OPTIONS.map(opt => (
                  <button key={opt.days} onClick={() => { onSnooze(reminder.id, opt.days); setShowSnooze(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onDelete(reminder.id)} className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      )}
      {done && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onUncomplete(reminder.id)} className="p-1.5 text-slate-500 hover:text-brand-500 dark:text-slate-400 dark:hover:text-brand-400 transition-colors" title="Mark as pending">
            <RotateCcw size={13} />
          </button>
          <button onClick={() => onDelete(reminder.id)} className="p-1.5 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors" title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function ReminderList({ contactId, companyId, propertyId }) {
  const { reminders, addReminder, updateReminder, completeReminder, uncompleteReminder, deleteReminder } = useCRM()
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [filterType, setFilterType] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [sortBy, setSortBy] = useState('dueDate')
  const [form, setForm] = useState({ title: '', type: 'call', dueDate: '', priority: 'medium', notes: '' })

  const relatedReminders = reminders.filter(r => {
    if (contactId && r.contactId === contactId) return true
    if (companyId && r.companyId === companyId) return true
    if (propertyId && r.propertyId === propertyId) return true
    return false
  })

  const pending = relatedReminders.filter(r => r.status !== 'done')
  const done = relatedReminders.filter(r => r.status === 'done')
  const overdueCount = pending.filter(r => isOverdue(r.dueDate)).length

  const displayed = useMemo(() => {
    let items = [...pending]
    if (filterType) items = items.filter(r => r.type === filterType)
    if (filterPriority) items = items.filter(r => r.priority === filterPriority)
    items.sort((a, b) => {
      if (sortBy === 'priority') return priorityWeight(b.priority) - priorityWeight(a.priority)
      if (sortBy === 'type') return (a.type || '').localeCompare(b.type || '')
      return (a.dueDate || '').localeCompare(b.dueDate || '')
    })
    return items
  }, [pending, filterType, filterPriority, sortBy])

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.dueDate) return
    await addReminder({ ...form, contactId, companyId, propertyId })
    setForm({ title: '', type: 'call', dueDate: '', priority: 'medium', notes: '' })
    setShowForm(false)
  }

  function startEdit(r) {
    setEditingId(r.id)
    setEditForm({ title: r.title, type: r.type, priority: r.priority, dueDate: r.dueDate, notes: r.notes || '' })
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editForm.title.trim() || !editForm.dueDate) return
    await updateReminder(editingId, editForm)
    setEditingId(null)
  }

  function handleSnooze(id, days) {
    updateReminder(id, { dueDate: addDays(new Date(), days).toISOString() })
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="os-zone-header">
        <div className="flex items-center gap-1.5">
          <Bell size={12} className="text-slate-400 dark:text-slate-500" />
          <span className="os-zone-title">Reminders</span>
          {pending.length > 0 && (
            <span className="v-badge bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">{pending.length}</span>
          )}
          {overdueCount > 0 && (
            <span className="v-badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{overdueCount} overdue</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowFilters(v => !v)}
            className={clsx('p-1 transition-colors', showFilters ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300')}>
            <Filter size={12} />
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className={clsx('p-1 transition-colors', showForm ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300')}>
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="px-5 py-2.5 bg-surface-50 dark:bg-surface-100 border-b border-[var(--border)] flex items-center gap-2 flex-wrap">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="v-input text-[11px] py-1 px-2 w-auto">
            <option value="">All types</option>
            {[...REMINDER_TYPES].filter(t => t !== 'other').sort((a, b) => a.localeCompare(b)).map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
            {REMINDER_TYPES.includes('other') && <option value="other">Other</option>}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="v-input text-[11px] py-1 px-2 w-auto">
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="v-input text-[11px] py-1 px-2 w-auto">
            <option value="dueDate">Sort by date</option>
            <option value="priority">Sort by priority</option>
            <option value="type">Sort by type</option>
          </select>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={submit} className="px-5 py-4 bg-surface-50 dark:bg-surface-100 border-b border-[var(--border)] space-y-2">
          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Task <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to happen?" className="v-input text-sm" required />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="v-input text-xs py-1.5">
                {[...REMINDER_TYPES].filter(t => t !== 'other').sort((a, b) => a.localeCompare(b)).map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                {REMINDER_TYPES.includes('other') && <option value="other">Other</option>}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="v-input text-xs py-1.5">
                {PRIORITIES.map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Due date <span className="text-red-500">*</span></label>
              <input type="date" value={(form.dueDate || '').slice(0, 10)} onChange={e => setForm(f => ({ ...f, dueDate: new Date(e.target.value + 'T09:00:00').toISOString() }))} className="v-input text-xs py-1.5" required />
            </div>
          </div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" rows={2} className="v-input text-sm resize-y" />
          <div className="flex gap-2 pt-1">
            <button type="submit" className="v-btn-primary text-xs py-1.5">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="v-btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {/* Pending reminders */}
      {displayed.length === 0 && !showForm && done.length === 0 && (
        <div className="px-5 py-8 text-center">
          <Bell size={22} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No reminders scheduled</p>
          <button onClick={() => setShowForm(true)} className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1">Add first reminder</button>
        </div>
      )}

      {displayed.length > 0 && (
        <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
          {displayed.map(r => (
            editingId === r.id ? (
              <form key={r.id} onSubmit={saveEdit} className="px-5 py-3.5 bg-brand-50/30 dark:bg-brand-900/10 space-y-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Task <span className="text-red-500">*</span></label>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className="v-input text-sm" required />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Type</label>
                    <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className="v-input text-xs py-1.5">
                      {[...REMINDER_TYPES].filter(t => t !== 'other').sort((a, b) => a.localeCompare(b)).map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                      {REMINDER_TYPES.includes('other') && <option value="other">Other</option>}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Priority</label>
                    <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="v-input text-xs py-1.5">
                      {PRIORITIES.map(p => <option key={p} value={p}>{capitalize(p)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Due date <span className="text-red-500">*</span></label>
                    <input type="date" value={(editForm.dueDate || '').slice(0, 10)} onChange={e => setEditForm(f => ({ ...f, dueDate: new Date(e.target.value + 'T09:00:00').toISOString() }))} className="v-input text-xs py-1.5" required />
                  </div>
                </div>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" rows={2} className="v-input text-sm resize-y" />
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="v-btn-primary text-xs py-1.5">Save</button>
                  <button type="button" onClick={() => setEditingId(null)} className="v-btn-secondary text-xs py-1.5">Cancel</button>
                </div>
              </form>
            ) : (
              <ReminderRow key={r.id} reminder={r} onComplete={completeReminder} onUncomplete={uncompleteReminder} onDelete={deleteReminder} onEdit={startEdit} onSnooze={handleSnooze} />
            )
          ))}
        </div>
      )}

      {/* Completed section */}
      {done.length > 0 && (
        <>
          <div className="px-5 py-2.5 border-t border-[var(--border)]">
            <button onClick={() => setShowCompleted(v => !v)} className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
              {showCompleted ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Completed ({done.length})
            </button>
          </div>
          {showCompleted && (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {done.map(r => <ReminderRow key={r.id} reminder={r} onComplete={completeReminder} onUncomplete={uncompleteReminder} onDelete={deleteReminder} onEdit={startEdit} onSnooze={handleSnooze} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

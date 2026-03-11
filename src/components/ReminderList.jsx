import { useState } from 'react'
import { Bell, CheckCircle2, Trash2, Plus } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { formatDate, isOverdue, isDueToday, PRIORITY_COLORS, TYPE_COLORS, REMINDER_TYPES, PRIORITIES } from '../utils/helpers'

function ReminderRow({ reminder, onComplete, onDelete }) {
  const overdue = isOverdue(reminder.dueDate)
  const today   = isDueToday(reminder.dueDate)
  return (
    <div className={clsx(
      'flex items-start gap-3 py-3 group',
      reminder.status === 'done' && 'opacity-50'
    )}>
      <button onClick={() => onComplete(reminder.id)} className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors">
        <CheckCircle2 size={17} className={reminder.status === 'done' ? 'text-green-500' : ''} />
      </button>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm', reminder.status === 'done' && 'line-through text-gray-400')}>{reminder.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={clsx('badge', overdue && reminder.status !== 'done' ? 'bg-red-100 text-red-700' : today ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500')}>
            {formatDate(reminder.dueDate)}
          </span>
          <span className={clsx('badge', TYPE_COLORS[reminder.type] || 'bg-gray-100 text-gray-600')}>{reminder.type}</span>
          {reminder.priority && <span className={clsx('badge', PRIORITY_COLORS[reminder.priority])}>{reminder.priority}</span>}
        </div>
        {reminder.notes && <p className="text-xs text-gray-400 mt-1 truncate">{reminder.notes}</p>}
      </div>
      <button onClick={() => onDelete(reminder.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default function ReminderList({ contactId, companyId, propertyId }) {
  const { reminders, addReminder, completeReminder, deleteReminder, getContact, getCompany, getProperty } = useCRM()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'call', dueDate: '', priority: 'medium', notes: '' })

  const relatedReminders = reminders.filter(r => {
    if (contactId  && r.contactId  === contactId)  return true
    if (companyId  && r.companyId  === companyId)   return true
    if (propertyId && r.propertyId === propertyId)  return true
    return false
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.dueDate) return
    addReminder({ ...form, contactId, companyId, propertyId })
    setForm({ title: '', type: 'call', dueDate: '', priority: 'medium', notes: '' })
    setShowForm(false)
  }

  const pending = relatedReminders.filter(r => r.status !== 'done')
  const done    = relatedReminders.filter(r => r.status === 'done')

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Follow-ups <span className="text-gray-400 font-normal">({pending.length})</span>
        </h3>
        <button onClick={() => setShowForm(v => !v)} className="btn-ghost text-xs py-1 px-2">
          <Plus size={12} /> Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to happen?" className="input text-sm" required />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input text-xs py-1.5">
              {REMINDER_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input text-xs py-1.5">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <input type="date" value={form.dueDate.slice(0, 10)} onChange={e => setForm(f => ({ ...f, dueDate: new Date(e.target.value + 'T09:00:00').toISOString() }))} className="input text-sm" required />
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" rows={2} className="input text-sm resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs py-1.5">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {relatedReminders.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 text-center py-4">No follow-ups scheduled</p>
      )}

      <div className="divide-y divide-gray-50">
        {pending.map(r => <ReminderRow key={r.id} reminder={r} onComplete={completeReminder} onDelete={deleteReminder} />)}
        {done.length > 0 && (
          <details className="pt-2">
            <summary className="text-xs text-gray-400 cursor-pointer select-none">Completed ({done.length})</summary>
            {done.map(r => <ReminderRow key={r.id} reminder={r} onComplete={completeReminder} onDelete={deleteReminder} />)}
          </details>
        )}
      </div>
    </div>
  )
}

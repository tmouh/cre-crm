import { useState } from 'react'
import { Phone, Mail, Users, FileText, Building2, Map, MessageSquare, Plus, Trash2, Edit3, Clock } from 'lucide-react'
import clsx from 'clsx'
import { formatDateTime, ACTIVITY_TYPES, TYPE_COLORS } from '../utils/helpers'
import { useCRM } from '../context/CRMContext'

const TYPE_ICONS = {
  call:     Phone,
  email:    Mail,
  meeting:  Users,
  note:     FileText,
  tour:     Map,
  proposal: Building2,
  other:    MessageSquare,
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

export default function ActivityFeed({ contactId, companyId, propertyId }) {
  const { activitiesFor, addActivity, updateActivity, deleteActivity } = useCRM()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('note')
  const [text, setText] = useState('')
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10))
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ type: '', description: '', date: '' })

  const field = contactId ? 'contactId' : companyId ? 'companyId' : 'propertyId'
  const id = contactId || companyId || propertyId
  const items = activitiesFor(field, id)

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    await addActivity({ type, description: text.trim(), contactId, companyId, propertyId, createdAt: activityDate ? new Date(activityDate + 'T12:00:00').toISOString() : undefined })
    setText('')
    setType('note')
    setActivityDate(new Date().toISOString().slice(0, 10))
    setShowForm(false)
  }

  function startEdit(a) {
    setEditingId(a.id)
    setEditForm({ type: a.type, description: a.description, date: (a.createdAt || '').slice(0, 10) })
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editForm.description.trim()) return
    await updateActivity(editingId, { type: editForm.type, description: editForm.description, createdAt: editForm.date ? new Date(editForm.date + 'T12:00:00').toISOString() : undefined })
    setEditingId(null)
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock size={15} className="text-brand-500" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Activity Log</h3>
          {items.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{items.length} entries</span>
          )}
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className={clsx('p-1.5 rounded-md transition-colors', showForm ? 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-900/20' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300')}>
          <Plus size={14} />
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <form onSubmit={submit} className="px-5 py-4 bg-gray-50/60 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          {/* Type picker pills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ACTIVITY_TYPES.map(t => {
              const Icon = TYPE_ICONS[t] || MessageSquare
              return (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={clsx('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    type === t
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 ring-1 ring-brand-200 dark:ring-brand-700'
                      : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                  )}>
                  <Icon size={11} /> {capitalize(t)}
                </button>
              )
            })}
          </div>
          <textarea autoFocus value={text} onChange={e => setText(e.target.value)}
            placeholder="What happened?" rows={3} className="input text-sm resize-y" />
          <div className="flex items-center gap-2 mt-2">
            <input type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} className="input text-xs py-1.5 w-36" />
            <div className="flex-1" />
            <button type="submit" className="btn-primary text-xs py-1.5">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {items.length === 0 && !showForm && (
        <div className="px-5 py-8 text-center">
          <MessageSquare size={22} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No activity logged yet</p>
          <button onClick={() => setShowForm(true)} className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-1">Log first activity</button>
        </div>
      )}

      {/* Timeline */}
      {items.length > 0 && (
        <div className="px-5 py-3">
          {items.map((a, i) => {
            const Icon = TYPE_ICONS[a.type] || MessageSquare
            return (
              <div key={a.id} className="flex gap-3 group relative">
                {/* Connector line */}
                {i < items.length - 1 && (
                  <div className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-100 dark:bg-gray-700/60" />
                )}
                {/* Icon circle */}
                <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 relative z-10',
                  TYPE_COLORS[a.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>
                  <Icon size={13} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pb-5">
                  {editingId === a.id ? (
                    <form onSubmit={saveEdit} className="bg-brand-50/30 dark:bg-brand-900/10 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className="input text-xs py-1.5 flex-1">
                          {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{capitalize(t)}</option>)}
                        </select>
                        <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="input text-xs py-1.5 w-36" />
                      </div>
                      <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        className="input text-sm resize-y" rows={2} />
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-xs py-1.5">Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1.5">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{a.description}</p>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                          <button onClick={() => startEdit(a)} className="p-1 text-gray-300 hover:text-brand-500 dark:text-gray-600 dark:hover:text-brand-400 transition-colors">
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => deleteActivity(a.id)} className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDateTime(a.createdAt)}</p>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

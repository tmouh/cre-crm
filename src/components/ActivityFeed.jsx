import { useState } from 'react'
import { Phone, Mail, Users, FileText, Building2, Map, MessageSquare, Plus, Trash2 } from 'lucide-react'
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

function ActivityItem({ activity, onDelete }) {
  const Icon = TYPE_ICONS[activity.type] || MessageSquare
  return (
    <div className="flex gap-3 py-3 group">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${TYPE_COLORS[activity.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200">{activity.description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{formatDateTime(activity.createdAt)}</p>
      </div>
      <button
        onClick={() => onDelete(activity.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-all"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default function ActivityFeed({ contactId, companyId, propertyId }) {
  const { activitiesFor, addActivity, deleteActivity } = useCRM()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('note')
  const [text, setText] = useState('')

  const field = contactId ? 'contactId' : companyId ? 'companyId' : 'propertyId'
  const id    = contactId || companyId || propertyId
  const items = activitiesFor(field, id)

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) return
    await addActivity({ type, description: text.trim(), contactId, companyId, propertyId })
    setText('')
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</h3>
        <button onClick={() => setShowForm(v => !v)} className="btn-ghost text-xs py-1 px-2">
          <Plus size={12} /> Log
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
          <select value={type} onChange={e => setType(e.target.value)} className="input text-xs py-1.5">
            {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What happened?"
            rows={3}
            className="input text-sm resize-none"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs py-1.5">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No activity logged yet</p>
      )}

      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
        {items.map(a => <ActivityItem key={a.id} activity={a} onDelete={deleteActivity} />)}
      </div>
    </div>
  )
}

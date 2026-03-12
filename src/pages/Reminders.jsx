import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle2, Trash2, Bell, Calendar } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { formatDate, isOverdue, isDueToday, PRIORITY_COLORS, TYPE_COLORS, REMINDER_TYPES, PRIORITIES, fullName } from '../utils/helpers'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import SearchableSelect from '../components/SearchableSelect'

const BLANK = { title: '', type: 'call', dueDate: '', priority: 'medium', contactId: '', companyId: '', propertyId: '', notes: '' }

function ReminderForm({ initial = BLANK, onSubmit, onCancel }) {
  const { contacts, companies, properties, addContact, addCompany, addProperty } = useCRM()
  const [form, setForm] = useState({ ...BLANK, ...initial, dueDate: initial.dueDate ? initial.dueDate.slice(0, 10) : '' })
  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const setField = (k) => (v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, dueDate: form.dueDate ? new Date(form.dueDate + 'T09:00:00').toISOString() : '' }) }} className="space-y-4">
      <div>
        <label className="label">Task *</label>
        <input value={form.title} onChange={f('title')} className="input" required placeholder="e.g. Follow up on LOI status" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Type</label>
          <select value={form.type} onChange={f('type')} className="input">
            {[...REMINDER_TYPES].filter(t => t !== 'other').sort((a, b) => a.localeCompare(b)).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            {REMINDER_TYPES.includes('other') && <option value="other">Other</option>}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select value={form.priority} onChange={f('priority')} className="input">
            {[...PRIORITIES].sort((a, b) => a.localeCompare(b)).map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Due date *</label>
          <input type="date" value={form.dueDate} onChange={f('dueDate')} className="input" required />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Contact</label>
          <SearchableSelect
            value={form.contactId}
            onChange={setField('contactId')}
            options={[...contacts].sort((a, b) => fullName(a).localeCompare(fullName(b))).map(c => ({ id: c.id, label: fullName(c) }))}
            placeholder="Search or create contact..."
            createLabel="Create"
            onCreate={async (name) => {
              const parts = name.split(' ')
              const firstName = parts[0] || ''
              const lastName = parts.slice(1).join(' ') || ''
              const created = await addContact({ firstName, lastName })
              setField('contactId')(created.id)
            }}
          />
        </div>
        <div>
          <label className="label">Company</label>
          <SearchableSelect
            value={form.companyId}
            onChange={setField('companyId')}
            options={[...companies].sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ id: c.id, label: c.name }))}
            placeholder="Search or create company..."
            createLabel="Create"
            onCreate={async (name) => {
              const created = await addCompany({ name })
              setField('companyId')(created.id)
            }}
          />
        </div>
        <div>
          <label className="label">Property</label>
          <SearchableSelect
            value={form.propertyId}
            onChange={setField('propertyId')}
            options={[...properties].sort((a, b) => (a.name || a.address || '').localeCompare(b.name || b.address || '')).map(p => ({ id: p.id, label: p.name || p.address }))}
            placeholder="Search or create property..."
            createLabel="Create"
            onCreate={async (name) => {
              const created = await addProperty({ address: name })
              setField('propertyId')(created.id)
            }}
          />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={2} className="input resize-y" placeholder="Context or instructions..." />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="btn-primary flex-1">Save Follow-up</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

function ReminderRow({ reminder, onComplete, onDelete, contact, company, property }) {
  const overdue = isOverdue(reminder.dueDate)
  const today   = isDueToday(reminder.dueDate)

  return (
    <div className={clsx(
      'flex items-start gap-3 p-4 rounded-xl border transition-all duration-150 group',
      reminder.status === 'done' ? 'border-gray-100 bg-gray-50/80 opacity-50 dark:border-gray-700 dark:bg-gray-800/50' :
      overdue ? 'border-red-200/80 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20' :
      today   ? 'border-orange-200/80 bg-orange-50 dark:border-orange-800/60 dark:bg-orange-900/20' :
                'border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
    )}>
      <button onClick={() => onComplete(reminder.id)} className={clsx('mt-0.5 flex-shrink-0 transition-colors', reminder.status === 'done' ? 'text-green-500' : 'text-gray-300 hover:text-green-500 dark:text-gray-600 dark:hover:text-green-400')}>
        <CheckCircle2 size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium', reminder.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100')}>{reminder.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {contact && <Link to={`/contacts/${contact.id}`} className="text-xs text-brand-600 hover:underline dark:text-brand-400">{fullName(contact)}</Link>}
          {company && <><span className="text-gray-300 dark:text-gray-600">·</span><Link to={`/companies/${company.id}`} className="text-xs text-gray-500 hover:underline dark:text-gray-400">{company.name}</Link></>}
          {property && <><span className="text-gray-300 dark:text-gray-600">·</span><Link to={`/properties/${property.id}`} className="text-xs text-gray-500 hover:underline dark:text-gray-400">{property.name}</Link></>}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className={clsx('badge text-[11px]', overdue && reminder.status !== 'done' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : today ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300')}>
            <Calendar size={10} className="inline mr-1" />{formatDate(reminder.dueDate)}
          </span>
          <span className={clsx('badge text-[11px]', TYPE_COLORS[reminder.type] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300')}>{reminder.type}</span>
          <span className={clsx('badge text-[11px]', PRIORITY_COLORS[reminder.priority])}>{reminder.priority}</span>
        </div>
        {reminder.notes && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 line-clamp-2">{reminder.notes}</p>}
      </div>
      <button onClick={() => onDelete(reminder.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-all flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export default function Reminders() {
  const { reminders, addReminder, completeReminder, deleteReminder, getContact, getCompany, getProperty } = useCRM()
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [filterType, setFilterType]     = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const all = reminders.filter(r => {
    const status   = filterStatus === 'pending' ? r.status !== 'done' : r.status === 'done'
    const type     = !filterType     || r.type === filterType
    const priority = !filterPriority || r.priority === filterPriority
    return status && type && priority
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const overdue = all.filter(r => r.status !== 'done' && isOverdue(r.dueDate))
  const today   = all.filter(r => r.status !== 'done' && isDueToday(r.dueDate))
  const upcoming = all.filter(r => r.status !== 'done' && !isOverdue(r.dueDate) && !isDueToday(r.dueDate))
  const done    = reminders.filter(r => r.status === 'done').sort((a, b) => (b.completedAt || b.dueDate).localeCompare(a.completedAt || a.dueDate))

  const pending = reminders.filter(r => r.status !== 'done')

  async function handleAdd(form) { await addReminder(form); setShowAdd(false) }

  function Section({ title, items, className }) {
    if (items.length === 0) return null
    return (
      <div className="mb-8">
        <h2 className={clsx('text-[11px] font-semibold uppercase tracking-wider mb-3 px-1', className)}>{title} <span className="font-normal normal-case tracking-normal opacity-60">({items.length})</span></h2>
        <div className="space-y-2">
          {items.map(r => (
            <ReminderRow key={r.id} reminder={r}
              contact={getContact(r.contactId)} company={getCompany(r.companyId)} property={getProperty(r.propertyId)}
              onComplete={completeReminder} onDelete={deleteReminder}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Follow-ups"
        subtitle={`${pending.length} pending · ${reminders.filter(r => r.status === 'done').length} completed`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Follow-up</button>}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {['pending', 'done'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={clsx('px-4 py-2 text-[13px] font-medium transition-all duration-150', filterStatus === s ? 'bg-brand-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700')}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input w-36">
          <option value="">All types</option>
          {[...REMINDER_TYPES].filter(t => t !== 'other').sort((a, b) => a.localeCompare(b)).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          {REMINDER_TYPES.includes('other') && <option value="other">Other</option>}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="input w-36">
          <option value="">All priorities</option>
          {[...PRIORITIES].sort((a, b) => a.localeCompare(b)).map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {filterStatus === 'pending' ? (
        all.length === 0 ? (
          <EmptyState icon={Bell} title="No pending follow-ups" description="You're all caught up." action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Follow-up</button>} />
        ) : (
          <>
            <Section title="Overdue"  items={overdue}  className="text-red-600 dark:text-red-400" />
            <Section title="Today"    items={today}    className="text-orange-600 dark:text-orange-400" />
            <Section title="Upcoming" items={upcoming} className="text-gray-500 dark:text-gray-400" />
          </>
        )
      ) : (
        done.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No completed follow-ups yet" />
        ) : (
          <div className="space-y-2">
            {done.map(r => (
              <ReminderRow key={r.id} reminder={r}
                contact={getContact(r.contactId)} company={getCompany(r.companyId)} property={getProperty(r.propertyId)}
                onComplete={completeReminder} onDelete={deleteReminder}
              />
            ))}
          </div>
        )
      )}

      {showAdd && (
        <Modal title="Add Follow-up" onClose={() => setShowAdd(false)} size="lg">
          <ReminderForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle2, Trash2, Bell, Calendar, RotateCcw } from 'lucide-react'
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
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, dueDate: form.dueDate ? new Date(form.dueDate + 'T09:00:00').toISOString() : '' }) }} className="space-y-3">
      <div>
        <label className="v-label">Task <span className="text-red-500">*</span></label>
        <input value={form.title} onChange={f('title')} className="v-input" required placeholder="e.g. Follow up on LOI status" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="v-label">Type</label>
          <select value={form.type} onChange={f('type')} className="v-select">
            {[...REMINDER_TYPES].filter(t => t !== 'other').sort((a, b) => a.localeCompare(b)).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            {REMINDER_TYPES.includes('other') && <option value="other">Other</option>}
          </select>
        </div>
        <div>
          <label className="v-label">Priority</label>
          <select value={form.priority} onChange={f('priority')} className="v-select">
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="v-label">Due date <span className="text-red-500">*</span></label>
          <input type="date" value={form.dueDate} onChange={f('dueDate')} className="v-input" required />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="v-label">Contact</label>
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
          <label className="v-label">Company</label>
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
          <label className="v-label">Property</label>
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
        <label className="v-label">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={2} className="v-input resize-y" placeholder="Context or instructions..." />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="v-btn-primary flex-1">Save Reminder</button>
        <button type="button" onClick={onCancel} className="v-btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

function ReminderRow({ reminder, onComplete, onUncomplete, onDelete, contact, company, property }) {
  const overdue = isOverdue(reminder.dueDate)
  const today   = isDueToday(reminder.dueDate)

  return (
    <div className={clsx(
      'flex items-start gap-2.5 px-3 py-2.5 border transition-all duration-150 group',
      reminder.status === 'done' ? 'border-[var(--border)] bg-surface-50 opacity-50 dark:bg-surface-100' :
      overdue ? 'border-red-200 bg-red-50 dark:border-red-800/60 dark:bg-red-900/20' :
      today   ? 'border-orange-200 bg-orange-50 dark:border-orange-800/60 dark:bg-orange-900/20' :
                'border-[var(--border)] bg-surface-0 hover:bg-surface-50 dark:hover:bg-surface-100'
    )}>
      {reminder.status === 'done' ? (
        <button onClick={() => onUncomplete(reminder.id)} className="mt-0.5 flex-shrink-0 text-green-500 hover:text-brand-500 transition-colors" title="Mark as pending">
          <RotateCcw size={14} />
        </button>
      ) : (
        <button onClick={() => onComplete(reminder.id)} className="mt-0.5 flex-shrink-0 text-slate-300 hover:text-green-500 dark:text-slate-600 dark:hover:text-green-400 transition-colors" title="Complete">
          <CheckCircle2 size={16} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <p className={clsx('text-[12px] font-medium', reminder.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100')}>{reminder.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {contact && <Link to={`/contacts/${contact.id}`} className="text-[10px] text-brand-600 hover:underline dark:text-brand-400">{fullName(contact)}</Link>}
          {company && <><span className="text-slate-300 dark:text-slate-600">·</span><Link to={`/companies/${company.id}`} className="text-[10px] text-slate-500 hover:underline dark:text-slate-400">{company.name}</Link></>}
          {property && <><span className="text-slate-300 dark:text-slate-600">·</span><Link to={`/deals/${property.id}`} className="text-[10px] text-slate-500 hover:underline dark:text-slate-400">{property.name}</Link></>}
        </div>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <span className={clsx('v-badge', overdue && reminder.status !== 'done' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : today ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300')}>
            <Calendar size={9} className="inline mr-0.5" />{formatDate(reminder.dueDate)}
          </span>
          <span className={clsx('v-badge', TYPE_COLORS[reminder.type] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>{reminder.type}</span>
          <span className={clsx('v-badge', PRIORITY_COLORS[reminder.priority])}>{reminder.priority}</span>
        </div>
        {reminder.notes && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">{reminder.notes}</p>}
      </div>
      <button onClick={() => onDelete(reminder.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all flex-shrink-0">
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export default function Reminders() {
  const { reminders, addReminder, completeReminder, uncompleteReminder, deleteReminder, getContact, getCompany, getProperty } = useCRM()
  const [showAdd, setShowAdd] = useState(false)
  const [filterStatus, setFilterStatus] = useState('pending')
  const [filterType, setFilterType]     = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const all = reminders.filter(r => {
    const status   = filterStatus === 'pending' ? r.status !== 'done' : r.status === 'done'
    const type     = !filterType     || r.type === filterType
    const priority = !filterPriority || r.priority === filterPriority
    return status && type && priority
  }).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  const overdue = all.filter(r => r.status !== 'done' && isOverdue(r.dueDate))
  const today   = all.filter(r => r.status !== 'done' && isDueToday(r.dueDate))
  const upcoming = all.filter(r => r.status !== 'done' && !isOverdue(r.dueDate) && !isDueToday(r.dueDate))
  const done    = all.filter(r => r.status === 'done').sort((a, b) => (b.completedAt || b.dueDate || '').localeCompare(a.completedAt || a.dueDate || ''))

  const pending = reminders.filter(r => r.status !== 'done')

  async function handleAdd(form) { await addReminder(form); setShowAdd(false) }

  function Section({ title, items, className }) {
    if (items.length === 0) return null
    return (
      <div className="mb-4">
        <h2 className={clsx('text-[10px] font-semibold font-mono uppercase tracking-wider mb-2 px-1', className)}>{title} <span className="font-normal normal-case tracking-normal opacity-60">({items.length})</span></h2>
        <div className="space-y-1">
          {items.map(r => (
            <ReminderRow key={r.id} reminder={r}
              contact={getContact(r.contactId)} company={getCompany(r.companyId)} property={getProperty(r.propertyId)}
              onComplete={completeReminder} onUncomplete={uncompleteReminder} onDelete={deleteReminder}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="os-toolbar flex-shrink-0">
        <div className="flex border border-[var(--border)] overflow-hidden">
          {['pending', 'done'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={clsx('px-3 py-1 text-[11px] font-medium transition-all', filterStatus === s ? 'bg-brand-600 text-white' : 'bg-surface-0 text-slate-500 hover:bg-surface-50 dark:text-slate-400 dark:hover:bg-surface-100')}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="v-select w-32 text-[11px]">
          <option value="">All types</option>
          {[...REMINDER_TYPES].filter(t => t !== 'other').sort((a, b) => a.localeCompare(b)).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          {REMINDER_TYPES.includes('other') && <option value="other">Other</option>}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="v-select w-32 text-[11px]">
          <option value="">All priorities</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">{pending.length} pending</span>
        <button onClick={() => setShowAdd(true)} className="v-btn-primary text-[10px]"><Plus size={11} /> NEW</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {filterStatus === 'pending' ? (
          all.length === 0 ? (
            <EmptyState icon={Bell} title="No pending reminders" description="You're all caught up." action={<button onClick={() => setShowAdd(true)} className="v-btn-primary"><Plus size={12} /> Add Reminder</button>} />
          ) : (
            <>
              <Section title="Overdue"  items={overdue}  className="text-red-600 dark:text-red-400" />
              <Section title="Today"    items={today}    className="text-orange-600 dark:text-orange-400" />
              <Section title="Upcoming" items={upcoming} className="text-slate-500 dark:text-slate-400" />
            </>
          )
        ) : (
          done.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No completed reminders yet" />
          ) : (
            <div className="space-y-1">
              {done.map(r => (
                <ReminderRow key={r.id} reminder={r}
                  contact={getContact(r.contactId)} company={getCompany(r.companyId)} property={getProperty(r.propertyId)}
                  onComplete={completeReminder} onUncomplete={uncompleteReminder} onDelete={deleteReminder}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Status bar */}
      <div className="os-status-bar flex-shrink-0">
        <span>{all.length} {filterStatus}</span>
        {filterType && <span>type: {filterType}</span>}
        {filterPriority && <span>priority: {filterPriority}</span>}
      </div>

      {showAdd && (
        <Modal title="Add Reminder" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <ReminderForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
    </div>
  )
}

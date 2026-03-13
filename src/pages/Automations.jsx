import { useState } from 'react'
import { Plus, Zap, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import clsx from 'clsx'
import { useCRM } from '../context/CRMContext'
import { DEAL_STATUSES, formatDealStatus, REMINDER_TYPES } from '../utils/helpers'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'

const BLANK = { name: '', triggerType: 'stage-change', triggerValue: '', actionType: 'create-reminder', actionConfig: { title: '', reminderType: 'call', priority: 'medium', daysFromNow: 1 }, enabled: true }

function AutomationForm({ initial = BLANK, onSubmit, onCancel }) {
  const [form, setForm] = useState({ ...BLANK, ...initial, actionConfig: { ...BLANK.actionConfig, ...(initial.actionConfig || {}) } })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } catch { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Automation name *</label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className="input" placeholder="e.g. Follow up when deal moves to Under LOI" />
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">When this happens...</p>
        <div>
          <label className="label">Trigger</label>
          <select value={form.triggerType} onChange={e => setForm(p => ({ ...p, triggerType: e.target.value }))} className="input">
            <option value="stage-change">Deal moves to stage</option>
          </select>
        </div>
        <div>
          <label className="label">Stage</label>
          <select value={form.triggerValue} onChange={e => setForm(p => ({ ...p, triggerValue: e.target.value }))} required className="input">
            <option value="">— Select stage —</option>
            {DEAL_STATUSES.map(s => <option key={s} value={s}>{formatDealStatus(s)}</option>)}
          </select>
        </div>
      </div>

      <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
        <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">Then do this...</p>
        <div>
          <label className="label">Action</label>
          <select value={form.actionType} onChange={e => setForm(p => ({ ...p, actionType: e.target.value }))} className="input">
            <option value="create-reminder">Create a reminder</option>
          </select>
        </div>
        {form.actionType === 'create-reminder' && (
          <>
            <div>
              <label className="label">Reminder title</label>
              <input value={form.actionConfig.title} onChange={e => setForm(p => ({ ...p, actionConfig: { ...p.actionConfig, title: e.target.value } }))} className="input" placeholder="e.g. Follow up on LOI status" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Type</label>
                <select value={form.actionConfig.reminderType} onChange={e => setForm(p => ({ ...p, actionConfig: { ...p.actionConfig, reminderType: e.target.value } }))} className="input">
                  {REMINDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select value={form.actionConfig.priority} onChange={e => setForm(p => ({ ...p, actionConfig: { ...p.actionConfig, priority: e.target.value } }))} className="input">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="label">Days from now</label>
                <input type="number" min="0" value={form.actionConfig.daysFromNow} onChange={e => setForm(p => ({ ...p, actionConfig: { ...p.actionConfig, daysFromNow: Number(e.target.value) } }))} className="input" />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

export default function Automations() {
  const { automations, addAutomation, updateAutomation, deleteAutomation } = useCRM()
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState(null)

  const editItem = editId ? automations.find(a => a.id === editId) : null

  return (
    <div className="px-8 py-8 max-w-3xl">
      <PageHeader
        title="Automations"
        subtitle={`${automations.length} workflow${automations.length !== 1 ? 's' : ''}`}
        actions={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Automation</button>}
      />

      {automations.length === 0 ? (
        <EmptyState icon={Zap} title="No automations yet" action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} /> Add Automation</button>} />
      ) : (
        <div className="space-y-3">
          {automations.map(auto => (
            <div key={auto.id} className="card p-4 flex items-center gap-4">
              <button
                onClick={() => updateAutomation(auto.id, { enabled: !auto.enabled })}
                className={clsx('flex-shrink-0 transition-colors', auto.enabled ? 'text-green-500' : 'text-gray-300 dark:text-gray-600')}
                title={auto.enabled ? 'Enabled — click to disable' : 'Disabled — click to enable'}
              >
                {auto.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-medium', auto.enabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500')}>{auto.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  When deal → <span className="font-medium">{formatDealStatus(auto.triggerValue)}</span>
                  {auto.actionType === 'create-reminder' && <> → Create <span className="font-medium">{auto.actionConfig?.reminderType}</span> reminder</>}
                </p>
              </div>
              <button onClick={() => setEditId(auto.id)} className="btn-ghost p-2 text-xs">Edit</button>
              <button onClick={() => { if (confirm('Delete?')) deleteAutomation(auto.id) }} className="btn-ghost p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Automation" onClose={() => setShowAdd(false)} size="lg" disableBackdropClose>
          <AutomationForm onSubmit={async (form) => { await addAutomation(form); setShowAdd(false) }} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {editItem && (
        <Modal title="Edit Automation" onClose={() => setEditId(null)} size="lg" disableBackdropClose>
          <AutomationForm initial={editItem} onSubmit={async (form) => { await updateAutomation(editId, form); setEditId(null) }} onCancel={() => setEditId(null)} />
        </Modal>
      )}
    </div>
  )
}

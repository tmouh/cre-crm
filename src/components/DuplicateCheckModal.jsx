import { AlertTriangle, Copy, Merge, X } from 'lucide-react'
import Modal from './Modal'

/**
 * Shows when a duplicate is detected during entity creation.
 * Props:
 *   entityType   – 'company' | 'contact' | 'property'
 *   newData      – the data the user is trying to add
 *   existing     – the existing duplicate record
 *   matchFields  – array of { label, newVal, existingVal } for side-by-side display
 *   onAdd        – called when user chooses "Add Anyway"
 *   onMerge      – called when user chooses "Merge" (updates existing with non-empty new fields)
 *   onCancel     – called when user cancels
 */
export default function DuplicateCheckModal({ entityType, matchFields, onAdd, onMerge, onCancel }) {
  return (
    <Modal title="Duplicate Detected" onClose={onCancel} size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            A {entityType} with similar details already exists. Choose how to proceed.
          </p>
        </div>

        {/* Side-by-side comparison */}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/60">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-1/4">Field</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-[37.5%]">Existing</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 w-[37.5%]">New</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {matchFields.map(({ label, existingVal, newVal }) => {
                const isDiff = (existingVal || '') !== (newVal || '')
                return (
                  <tr key={label}>
                    <td className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{existingVal || <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                    <td className={`px-4 py-2 ${isDiff ? 'text-brand-600 dark:text-brand-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                      {newVal || <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-1">
          <button onClick={onMerge} className="btn-primary w-full flex items-center justify-center gap-2">
            <Merge size={14} /> Merge with existing
            <span className="text-xs opacity-70 ml-1">— fill in blank fields on existing record</span>
          </button>
          <button onClick={onAdd} className="btn-secondary w-full flex items-center justify-center gap-2">
            <Copy size={14} /> Add as duplicate
          </button>
          <button onClick={onCancel} className="btn-ghost w-full flex items-center justify-center gap-2">
            <X size={14} /> Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

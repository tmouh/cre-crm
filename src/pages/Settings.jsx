import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Settings as SettingsIcon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { COMPANY_TYPES, PRIORITIES } from '../utils/helpers'
import PageHeader from '../components/PageHeader'

const STORAGE_PREFIX = 'vanadium-setting-'

function useSetting(key, fallback) {
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(STORAGE_PREFIX + key) || fallback } catch { return fallback }
  })
  function set(v) {
    setValue(v)
    try { localStorage.setItem(STORAGE_PREFIX + key, v) } catch {}
  }
  return [value, set]
}

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [defaultCompanyType, setDefaultCompanyType] = useSetting('default-company-type', 'other')
  const [defaultPriority, setDefaultPriority] = useSetting('default-priority', 'medium')
  const [pageSize, setPageSize] = useSetting('page-size', '50')

  const themeOptions = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
    { value: 'system', label: 'System', Icon: Monitor },
  ]

  return (
    <div className="px-8 py-8 max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage your preferences" />

      {/* Appearance */}
      <section className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Appearance</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Choose how Vanadium CRM looks to you.</p>

        <div className="flex gap-3">
          {themeOptions.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 transition-all ${
                theme === value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <Icon size={20} className={theme === value ? 'text-brand-600' : 'text-gray-400 dark:text-gray-500'} />
              <span className={`text-sm font-medium ${
                theme === value ? 'text-brand-700 dark:text-brand-400' : 'text-gray-600 dark:text-gray-300'
              }`}>{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Defaults */}
      <section className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Defaults</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Set default values for new records.</p>

        <div className="space-y-4">
          <div>
            <label className="label">Default company type</label>
            <select value={defaultCompanyType} onChange={e => setDefaultCompanyType(e.target.value)} className="input max-w-xs">
              {COMPANY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Default reminder priority</label>
            <select value={defaultPriority} onChange={e => setDefaultPriority(e.target.value)} className="input max-w-xs">
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Display */}
      <section className="card p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Display</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Configure how data is displayed.</p>

        <div>
          <label className="label">Items per page</label>
          <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="input max-w-xs">
            {['25', '50', '100', '200'].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </section>
    </div>
  )
}

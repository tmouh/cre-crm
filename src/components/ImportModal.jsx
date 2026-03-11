import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileText } from 'lucide-react'
import { useCRM } from '../context/CRMContext'

// ─── CSV parser (handles quoted fields with commas inside) ─────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  function parseLine(line) {
    const result = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        result.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).filter(l => l.trim()).map(parseLine)
  return { headers, rows }
}

// ─── Normalise a header string for matching ───────────────────────────────────
function norm(s) { return s.toLowerCase().replace(/[\s_\-]/g, '') }

// ─── Column alias maps ────────────────────────────────────────────────────────
const CONTACT_ALIASES = {
  firstName:  ['firstname','first','fname'],
  lastName:   ['lastname','last','lname'],
  title:      ['title','jobtitle','role'],
  company:    ['company','companyname','organization','org'],
  email:      ['email','emailaddress'],
  phone:      ['phone','phonenumber','tel','telephone'],
  mobile:     ['mobile','cell','cellphone'],
  linkedIn:   ['linkedin','linkedinurl'],
  tags:       ['tags','tag'],
  notes:      ['notes','note','comments'],
}

const COMPANY_ALIASES = {
  name:    ['name','companyname','organization'],
  type:    ['type','companytype'],
  address: ['address','addr'],
  phone:   ['phone','tel','telephone'],
  email:   ['email','emailaddress'],
  website: ['website','url','web'],
  tags:    ['tags','tag'],
  notes:   ['notes','note','comments'],
}

const PROPERTY_ALIASES = {
  name:           ['name','propertyname'],
  address:        ['address','addr'],
  type:           ['type','propertytype'],
  subtype:        ['subtype','class'],
  size:           ['size','sf','sqft','squarefeet'],
  sizeUnit:       ['sizeunit','unit','units'],
  status:         ['status'],
  askingRent:     ['askingrent','rent','askingprice'],
  rentUnit:       ['rentunit','rentperiod'],
  ownerCompany:   ['ownercompany','owner','landlord'],
  tenantCompany:  ['tenantcompany','tenant'],
  floor:          ['floor','suite','floorsuite'],
  tags:           ['tags','tag'],
  notes:          ['notes','note','comments'],
}

function buildMapping(headers, aliases) {
  const map = {} // fieldName -> headerIndex
  for (const [field, aliasList] of Object.entries(aliases)) {
    const idx = headers.findIndex(h => aliasList.includes(norm(h)))
    if (idx !== -1) map[field] = idx
  }
  return map
}

function getCell(row, map, field) {
  const idx = map[field]
  return idx !== undefined ? (row[idx] || '').trim() : ''
}

// ─── Row transformers ─────────────────────────────────────────────────────────
function rowToCompany(row, map) {
  const v = (f) => getCell(row, map, f)
  return {
    name:    v('name'),
    type:    v('type') || 'other',
    address: v('address'),
    phone:   v('phone'),
    email:   v('email'),
    website: v('website'),
    tags:    v('tags') ? v('tags').split(';').map(t => t.trim()).filter(Boolean) : [],
    notes:   v('notes'),
  }
}

function rowToContact(row, map, companies) {
  const v = (f) => getCell(row, map, f)
  const compName = v('company')
  const companyId = compName
    ? (companies.find(c => c.name.toLowerCase() === compName.toLowerCase())?.id || '')
    : ''
  return {
    firstName: v('firstName'),
    lastName:  v('lastName'),
    title:     v('title'),
    companyId,
    email:     v('email'),
    phone:     v('phone'),
    mobile:    v('mobile'),
    linkedIn:  v('linkedIn'),
    tags:      v('tags') ? v('tags').split(';').map(t => t.trim()).filter(Boolean) : [],
    notes:     v('notes'),
    ownerIds:  [],
  }
}

function rowToProperty(row, map, companies) {
  const v = (f) => getCell(row, map, f)
  const ownerName  = v('ownerCompany')
  const tenantName = v('tenantCompany')
  return {
    name:            v('name'),
    address:         v('address'),
    type:            v('type') || 'office',
    subtype:         v('subtype'),
    size:            v('size') ? Number(v('size')) : undefined,
    sizeUnit:        v('sizeUnit') || 'SF',
    status:          v('status') || 'available',
    askingRent:      v('askingRent') ? Number(v('askingRent')) : undefined,
    rentUnit:        v('rentUnit') || '/SF/yr',
    ownerCompanyId:  ownerName  ? (companies.find(c => c.name.toLowerCase() === ownerName.toLowerCase())?.id  || '') : '',
    tenantCompanyId: tenantName ? (companies.find(c => c.name.toLowerCase() === tenantName.toLowerCase())?.id || '') : '',
    contactIds:      [],
    floor:           v('floor'),
    tags:            v('tags') ? v('tags').split(';').map(t => t.trim()).filter(Boolean) : [],
    notes:           v('notes'),
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
const ENTITY_LABELS = { contacts: 'Contacts', companies: 'Companies', properties: 'Properties' }

export default function ImportModal({ entity, onClose }) {
  const { companies, addContact, addCompany, addProperty } = useCRM()
  const [rawText, setRawText]   = useState('')
  const [phase, setPhase]       = useState('idle') // idle | preview | importing | done
  const [parsed, setParsed]     = useState(null)   // { headers, rows, mapping, mapped }
  const [results, setResults]   = useState([])     // [{ ok, error }]
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setRawText(ev.target.result)
    reader.readAsText(file)
  }

  function handlePreview() {
    const { headers, rows } = parseCSV(rawText)
    if (!headers.length || !rows.length) return

    const aliases = entity === 'contacts' ? CONTACT_ALIASES
      : entity === 'companies' ? COMPANY_ALIASES
      : PROPERTY_ALIASES

    const mapping = buildMapping(headers, aliases)

    // Build human-readable preview rows (first 5)
    const preview = rows.slice(0, 5).map(r => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = r[i] || '' })
      return obj
    })

    setParsed({ headers, rows, mapping, preview })
    setPhase('preview')
  }

  async function handleImport() {
    setPhase('importing')
    const { rows, mapping } = parsed
    const res = []

    for (const row of rows) {
      try {
        if (entity === 'companies') {
          const obj = rowToCompany(row, mapping)
          if (!obj.name) throw new Error('Missing name')
          await addCompany(obj)
        } else if (entity === 'contacts') {
          const obj = rowToContact(row, mapping, companies)
          if (!obj.firstName || !obj.lastName) throw new Error('Missing first or last name')
          await addContact(obj)
        } else {
          const obj = rowToProperty(row, mapping, companies)
          if (!obj.name) throw new Error('Missing name')
          await addProperty(obj)
        }
        res.push({ ok: true })
      } catch (err) {
        res.push({ ok: false, error: err.message || 'Unknown error' })
      }
    }

    setResults(res)
    setPhase('done')
  }

  const okCount  = results.filter(r => r.ok).length
  const errCount = results.filter(r => !r.ok).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Import {ENTITY_LABELS[entity]}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* ── Idle: paste or upload ── */}
          {phase === 'idle' && (
            <>
              <p className="text-sm text-gray-500">
                Paste CSV text below or upload a <code>.csv</code> file. The first row must be a header row.
                Column names are matched automatically (case-insensitive).
              </p>

              {entity === 'contacts' && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  Recognised columns: <span className="font-mono">firstName, lastName, title, company, email, phone, mobile, linkedIn, tags, notes</span>
                  <br />For <span className="font-mono">company</span>, use the exact company name — it will be matched to an existing company. For <span className="font-mono">tags</span>, separate multiple values with semicolons.
                </p>
              )}
              {entity === 'companies' && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  Recognised columns: <span className="font-mono">name, type, address, phone, email, website, tags, notes</span>
                  <br />Valid types: owner, tenant, investor, developer, broker, lender, other.
                </p>
              )}
              {entity === 'properties' && (
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  Recognised columns: <span className="font-mono">name, address, type, subtype, size, sizeUnit, status, askingRent, rentUnit, ownerCompany, tenantCompany, floor, tags, notes</span>
                  <br />For <span className="font-mono">ownerCompany / tenantCompany</span>, use exact company names. Tags separated by semicolons.
                </p>
              )}

              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                className="input resize-none font-mono text-xs"
                rows={8}
                placeholder={`firstName,lastName,email\nJane,Smith,jane@example.com`}
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <FileText size={14} /> Upload .csv file
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                {rawText && <span className="text-xs text-gray-400">{rawText.split('\n').length - 1} data rows detected</span>}
              </div>
            </>
          )}

          {/* ── Preview ── */}
          {phase === 'preview' && parsed && (
            <>
              <p className="text-sm text-gray-600">
                <span className="font-medium">{parsed.rows.length} rows</span> ready to import. Preview of first 5:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      {parsed.headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium border-b border-gray-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsed.preview.map((row, i) => (
                      <tr key={i}>
                        {parsed.headers.map(h => (
                          <td key={h} className="px-3 py-1.5 text-gray-700 max-w-[150px] truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <p className="text-xs text-gray-400">…and {parsed.rows.length - 5} more rows not shown.</p>
              )}
            </>
          )}

          {/* ── Importing ── */}
          {phase === 'importing' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={28} className="animate-spin text-brand-600" />
              <p className="text-sm text-gray-600">Importing {parsed.rows.length} rows…</p>
            </div>
          )}

          {/* ── Done ── */}
          {phase === 'done' && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 text-sm font-medium ${errCount === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                {errCount === 0
                  ? <><CheckCircle size={16} /> All {okCount} rows imported successfully.</>
                  : <><AlertCircle size={16} /> {okCount} imported, {errCount} failed.</>
                }
              </div>
              {errCount > 0 && (
                <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {results.map((r, i) => !r.ok && (
                    <p key={i} className="text-red-500">Row {i + 1}: {r.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          {phase === 'idle' && (
            <>
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                onClick={handlePreview}
                disabled={!rawText.trim()}
                className="btn-primary"
              >
                <Upload size={14} /> Preview Import
              </button>
            </>
          )}
          {phase === 'preview' && (
            <>
              <button onClick={() => setPhase('idle')} className="btn-secondary">Back</button>
              <button onClick={handleImport} className="btn-primary">
                Import {parsed.rows.length} rows
              </button>
            </>
          )}
          {phase === 'done' && (
            <button onClick={onClose} className="btn-primary">Done</button>
          )}
        </div>
      </div>
    </div>
  )
}

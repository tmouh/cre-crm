import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2, FileText, UserPlus } from 'lucide-react'
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
  firstName:           ['firstname','first','fname'],
  lastName:            ['lastname','last','lname'],
  title:               ['title','jobtitle','role'],
  contactFunction:     ['function','contactfunction','type','contacttype'],
  company:             ['company','companyname','organization','org'],
  email:               ['email','emailaddress'],
  phone:               ['phone','phonenumber','tel','telephone'],
  mobile:              ['mobile','cell','cellphone'],
  linkedIn:            ['linkedin','linkedinurl'],
  tags:                ['tags','tag'],
  notes:               ['notes','note','comments'],
}

const COMPANY_ALIASES = {
  name:                ['name','companyname','organization'],
  type:                ['type','companytype'],
  address:             ['address','addr'],
  phone:               ['phone','tel','telephone'],
  email:               ['email','emailaddress'],
  website:             ['website','url','web'],
  tags:                ['tags','tag'],
  notes:               ['notes','note','comments'],
  capitalType:         ['capitaltype','capital','investmenttype'],
  propertyTypes:       ['propertytypes','targetpropertytypes','assettypes'],
  minDealSize:         ['mindealsize','minsize','minimumsize'],
  maxDealSize:         ['maxdealsize','maxsize','maximumsize'],
  targetMarkets:       ['targetmarkets','markets','market'],
  targetReturns:       ['targetreturns','returns','irr'],
  investmentCriteria:  ['investmentcriteria','criteria'],
}

const PROPERTY_ALIASES = {
  name:           ['name','propertyname','dealname'],
  address:        ['address','addr'],
  dealType:       ['dealtype','type','propertytype'],
  size:           ['size','sf','sqft','squarefeet'],
  sizeUnit:       ['sizeunit','unit','units'],
  status:         ['status','dealstatus'],
  dealValue:      ['dealvalue','value','price','amount'],
  ownerCompany:   ['ownercompany','owner','landlord','sponsor'],
  tenantCompany:  ['tenantcompany','tenant','borrower'],
  tags:           ['tags','tag'],
  notes:          ['notes','note','comments'],
}

const DEAL_ALIASES = {
  dealGroup:    ['group','dealgroup'],
  name:         ['name','dealname'],
  city:         ['city','cityregion','city/region','region'],
  state:        ['state'],
  dealCategory: ['stage','dealcategory','category','transactiontype'],
  status:       ['status','dealstatus','dealstage'],
  propertyType: ['propertytype','assettype'],
  dealType:     ['dealtype','type','dealstructure'],
  dealValue:    ['amount','dealvalue','value','price'],
  contact:      ['contact','contactname'],
  company:      ['company','companyname'],
  notes:        ['notes','note','comments'],
  tags:         ['tags','tag'],
}

const COMP_ALIASES = {
  address:      ['address','addr','property','propertyaddress'],
  propertyType: ['propertytype','type','assettype'],
  saleDate:     ['saledate','date','closedate','transactiondate'],
  salePrice:    ['saleprice','price','salesprice','transactionprice','amount'],
  capRate:      ['caprate','cap','capratepcnt'],
  pricePerSf:   ['pricepersf','priceperft','psf','ppsf'],
  noi:          ['noi','netoperatingincome'],
  size:         ['size','sf','sqft','squarefeet','buildingsize'],
  sizeUnit:     ['sizeunit','unit','units'],
  buyer:        ['buyer','purchaser'],
  seller:       ['seller','vendor','grantor'],
  market:       ['market','city','region'],
  submarket:    ['submarket','neighborhood','subarea'],
  yearBuilt:    ['yearbuilt','year','built'],
  tags:         ['tags','tag'],
  notes:        ['notes','note','comments'],
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
    name:               v('name'),
    type:               v('type') || 'other',
    address:            v('address'),
    phone:              v('phone'),
    email:              v('email'),
    website:            v('website'),
    tags:               v('tags') ? v('tags').split(';').map(t => t.trim()).filter(Boolean) : [],
    notes:              v('notes'),
    capitalType:        v('capitalType') || '',
    propertyTypes:      v('propertyTypes') ? v('propertyTypes').split(';').map(t => t.trim()).filter(Boolean) : [],
    minDealSize:        v('minDealSize') ? Number(v('minDealSize').replace(/[$,]/g, '')) : '',
    maxDealSize:        v('maxDealSize') ? Number(v('maxDealSize').replace(/[$,]/g, '')) : '',
    targetMarkets:      v('targetMarkets') ? v('targetMarkets').split(';').map(t => t.trim()).filter(Boolean) : [],
    targetReturns:      v('targetReturns') || '',
    investmentCriteria: v('investmentCriteria') || '',
  }
}

function rowToContact(row, map, companies) {
  const v = (f) => getCell(row, map, f)
  const compName = v('company')
  const companyId = compName
    ? (companies.find(c => c.name.toLowerCase() === compName.toLowerCase())?.id || '')
    : ''
  return {
    firstName:          v('firstName'),
    lastName:           v('lastName'),
    title:              v('title'),
    contactFunction:    v('contactFunction') || '',
    companyId,
    email:              v('email'),
    phone:              v('phone'),
    mobile:             v('mobile'),
    linkedIn:           v('linkedIn'),
    tags:               v('tags') ? v('tags').split(';').map(t => t.trim()).filter(Boolean) : [],
    notes:              v('notes'),
    ownerIds:           [],
  }
}

function rowToComp(row, map) {
  const v = (f) => getCell(row, map, f)
  const saleDate = v('saleDate')
  return {
    address:      v('address'),
    propertyType: v('propertyType'),
    saleDate:     saleDate ? new Date(saleDate + 'T00:00:00').toISOString() : null,
    salePrice:    v('salePrice') ? Number(v('salePrice').replace(/[$,]/g, '')) : '',
    capRate:      v('capRate') ? Number(v('capRate').replace(/%/g, '')) : '',
    pricePerSf:   v('pricePerSf') ? Number(v('pricePerSf').replace(/[$,]/g, '')) : '',
    noi:          v('noi') ? Number(v('noi').replace(/[$,]/g, '')) : '',
    size:         v('size') ? Number(v('size').replace(/,/g, '')) : '',
    sizeUnit:     v('sizeUnit') || 'SF',
    buyer:        v('buyer'),
    seller:       v('seller'),
    market:       v('market'),
    submarket:    v('submarket'),
    yearBuilt:    v('yearBuilt') ? Number(v('yearBuilt')) : '',
    tags:         v('tags') ? v('tags').split(';').map(t => t.trim()).filter(Boolean) : [],
    notes:        v('notes'),
  }
}

function rowToProperty(row, map, companies) {
  const v = (f) => getCell(row, map, f)
  const ownerName  = v('ownerCompany')
  const tenantName = v('tenantCompany')
  return {
    name:            v('name'),
    address:         v('address'),
    dealType:        v('dealType') || '',
    size:            v('size') ? Number(v('size')) : undefined,
    sizeUnit:        v('sizeUnit') || 'SF',
    status:          v('status') || 'prospect',
    dealValue:       v('dealValue') ? Number(v('dealValue')) : undefined,
    ownerCompanyId:  ownerName  ? (companies.find(c => c.name.toLowerCase() === ownerName.toLowerCase())?.id  || '') : '',
    tenantCompanyId: tenantName ? (companies.find(c => c.name.toLowerCase() === tenantName.toLowerCase())?.id || '') : '',
    contactIds:      [],
    tags:            v('tags') ? v('tags').split(';').map(t => t.trim()).filter(Boolean) : [],
    notes:           v('notes'),
  }
}

function normalizeDealCategory(raw) {
  if (!raw || raw === '-') return ''
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

function normalizeDealType(raw) {
  if (!raw || raw === '-') return ''
  return raw.trim().toLowerCase()
    .replace(/\s*\/\s*/g, '-')   // debt/equity → debt-equity
    .replace(/\s+/g, '-')        // spaces → hyphens
    .replace(/-{2,}/g, '-')      // collapse double hyphens
}

function rowToDeal(row, map, companies, contacts) {
  const v = (f) => getCell(row, map, f)
  const compName     = v('company')
  const ownerCompanyId = compName
    ? (companies.find(c => c.name.toLowerCase() === compName.toLowerCase())?.id || '') : ''
  const contactName  = v('contact').trim()
  const contactIds   = contactName
    ? contacts.filter(c => {
        const full = `${c.firstName} ${c.lastName}`.toLowerCase()
        return full === contactName.toLowerCase()
      }).map(c => c.id)
    : []
  return {
    dealGroup:    v('dealGroup'),
    name:         v('name'),
    city:         v('city'),
    state:        v('state'),
    dealCategory: normalizeDealCategory(v('dealCategory')),
    status:       v('status') || 'prospect',
    propertyType: v('propertyType') === '-' ? '' : v('propertyType'),
    dealType:     normalizeDealType(v('dealType')),
    dealValue:    v('dealValue') && v('dealValue') !== '-' ? Number(v('dealValue').replace(/[$,m]/gi, '')) * (v('dealValue').toLowerCase().includes('m') ? 1000000 : 1) : undefined,
    ownerCompanyId,
    contactIds,
    notes:        v('notes') === '-' ? '' : v('notes'),
    tags:         v('tags') ? v('tags').split(';').map(t => t.trim()).filter(t => t && t !== '-') : [],
    ownerIds:     [],
    _rawContactName: contactName,
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
const ENTITY_LABELS = { contacts: 'Contacts', companies: 'Companies', properties: 'Properties', comps: 'Comps', deals: 'Deals' }

export default function ImportModal({ entity, onClose }) {
  const { companies, contacts, properties, addContact, addCompany, addProperty, updateProperty, addComp } = useCRM()
  const [rawText, setRawText]   = useState('')
  const [phase, setPhase]       = useState('idle') // idle | preview | contact-review | importing | done
  const [parsed, setParsed]     = useState(null)   // { headers, rows, mapping, mapped }
  const [results, setResults]   = useState([])     // [{ ok, error }]
  const fileRef = useRef()
  const [hasHeaders, setHasHeaders] = useState(true)
  // contact-review state
  const [unmatchedContacts, setUnmatchedContacts] = useState([]) // [{ name, rows: [rowIdx] }]
  const [selectedContacts, setSelectedContacts] = useState({})   // name -> bool
  const [overwriteDeals, setOverwriteDeals] = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setRawText(ev.target.result)
    reader.readAsText(file)
  }

  function handlePreview() {
    let { headers, rows } = parseCSV(rawText)
    if (!headers.length) return
    if (!hasHeaders) {
      rows = [headers, ...rows]
      headers = headers.map((_, i) => String.fromCharCode(65 + i))
    }
    if (!rows.length) return

    const aliases = entity === 'contacts' ? CONTACT_ALIASES
      : entity === 'companies' ? COMPANY_ALIASES
      : entity === 'comps' ? COMP_ALIASES
      : entity === 'deals' ? DEAL_ALIASES
      : PROPERTY_ALIASES

    const mapping = buildMapping(headers, aliases)

    const preview = rows.slice(0, 5).map(r => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = r[i] || '' })
      return obj
    })

    setParsed({ headers, rows, mapping, preview })
    setPhase('preview')
  }

  function handlePreviewContinue() {
    if (entity !== 'deals') { handleImport(); return }
    // Find contact names that don't match any existing contact
    const { rows, mapping } = parsed
    const nameMap = {}
    rows.forEach((row, i) => {
      const name = getCell(row, mapping, 'contact').trim()
      if (!name) return
      const matched = contacts.some(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase() === name.toLowerCase()
      )
      if (!matched) {
        if (!nameMap[name]) nameMap[name] = []
        nameMap[name].push(i)
      }
    })
    const unmatched = Object.entries(nameMap).map(([name, rows]) => ({ name, rows }))
    if (unmatched.length === 0) { handleImport(); return }
    setUnmatchedContacts(unmatched)
    const sel = {}
    unmatched.forEach(u => { sel[u.name] = true })
    setSelectedContacts(sel)
    setPhase('contact-review')
  }

  async function handleImport(newContactsByName = {}) {
    setPhase('importing')
    const { rows, mapping } = parsed
    const res = []

    // Merge newly created contacts into local lookup
    const allContacts = [...contacts, ...Object.values(newContactsByName)]

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
        } else if (entity === 'comps') {
          const obj = rowToComp(row, mapping)
          if (!obj.address) throw new Error('Missing address')
          if (!obj.salePrice) throw new Error('Missing sale price')
          await addComp(obj)
        } else if (entity === 'deals') {
          const obj = rowToDeal(row, mapping, companies, allContacts)
          if (!obj.name) throw new Error('Missing name')
          const { _rawContactName, ...dealObj } = obj
          if (overwriteDeals) {
            const existing = properties.find(p => !p.deletedAt && p.name?.toLowerCase() === dealObj.name.toLowerCase())
            if (existing) {
              await updateProperty(existing.id, dealObj)
              res.push({ ok: true })
              continue
            }
          }
          await addProperty(dealObj)
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

  async function handleContactReviewContinue() {
    const namesToCreate = unmatchedContacts.filter(u => selectedContacts[u.name]).map(u => u.name)
    // Create minimal contact records and collect them
    const newContactsByName = {}
    for (const name of namesToCreate) {
      try {
        const parts = name.trim().split(/\s+/)
        const firstName = parts[0] || name
        const lastName  = parts.slice(1).join(' ') || ''
        const created = await addContact({ firstName, lastName, ownerIds: [], tags: [] })
        if (created) newContactsByName[name] = created
      } catch (err) {
        console.error('Failed to create contact:', name, err)
      }
    }
    handleImport(newContactsByName)
  }

  const okCount  = results.filter(r => r.ok).length
  const errCount = results.filter(r => !r.ok).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Import {ENTITY_LABELS[entity]}</h2>
          <button onClick={onClose} className="v-btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* ── Idle: paste or upload ── */}
          {phase === 'idle' && (
            <>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Paste CSV text below or upload a <code>.csv</code> file.
                  Column names are matched automatically (case-insensitive).
                </p>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap flex-shrink-0 cursor-pointer mt-0.5">
                  <input
                    type="checkbox"
                    checked={hasHeaders}
                    onChange={e => setHasHeaders(e.target.checked)}
                    className="flex-shrink-0"
                  />
                  CSV has headers
                </label>
              </div>

              {entity === 'contacts' && (
                <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-slate-500 dark:text-slate-400">Expected column order:</p>
                  <p className="font-mono bg-white dark:bg-slate-800 px-2 py-1 border border-[var(--border)] text-[11px] overflow-x-auto whitespace-nowrap">firstName*, lastName*, title, function, company, email, phone, mobile, linkedIn, tags, notes</p>
                  <p>* Required. <code className="font-mono">company</code> = exact company name. <code className="font-mono">function</code>: lp-investor, broker, developer, lender, owner-operator, tenant, attorney, accountant, property-manager, other. Arrays separated by semicolons.</p>
                </div>
              )}
              {entity === 'companies' && (
                <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-slate-500 dark:text-slate-400">Expected column order:</p>
                  <p className="font-mono bg-white dark:bg-slate-800 px-2 py-1 border border-[var(--border)] text-[11px] overflow-x-auto whitespace-nowrap">name*, type, address, phone, email, website, tags, notes, capitalType, propertyTypes, minDealSize, maxDealSize, targetMarkets, targetReturns, investmentCriteria</p>
                  <p>* Required. Types: owner, tenant, investor, developer, broker, lender, other. Arrays separated by semicolons.</p>
                </div>
              )}
              {entity === 'properties' && (
                <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-slate-500 dark:text-slate-400">Expected column order:</p>
                  <p className="font-mono bg-white dark:bg-slate-800 px-2 py-1 border border-[var(--border)] text-[11px] overflow-x-auto whitespace-nowrap">name*, address, dealType, size, sizeUnit, status, dealValue, ownerCompany, tenantCompany, tags, notes</p>
                  <p>* Required. <code className="font-mono">ownerCompany / tenantCompany</code> = exact company names. Tags separated by semicolons.</p>
                </div>
              )}
              {entity === 'comps' && (
                <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-slate-500 dark:text-slate-400">Expected column order:</p>
                  <p className="font-mono bg-white dark:bg-slate-800 px-2 py-1 border border-[var(--border)] text-[11px] overflow-x-auto whitespace-nowrap">address*, salePrice*, propertyType, saleDate, capRate, pricePerSf, noi, size, sizeUnit, buyer, seller, market, submarket, yearBuilt, tags, notes</p>
                  <p>* Required. Dates: YYYY-MM-DD. Numbers without $ or %. Cap rate as decimal (5.25 = 5.25%). Tags separated by semicolons.</p>
                </div>
              )}
              {entity === 'deals' && (
                <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 space-y-1.5">
                  <p className="font-medium text-slate-500 dark:text-slate-400">Expected column order:</p>
                  <p className="font-mono bg-white dark:bg-slate-800 px-2 py-1 border border-[var(--border)] text-[11px] overflow-x-auto whitespace-nowrap">name*, group, city/region, state, stage, property type, deal type, amount, contact, company, notes, tags</p>
                  <p>* Required. <code className="font-mono">stage</code> = deal category (Acquisition, Development, Recapitalization, Sale, RFP). <code className="font-mono">deal type</code> = capital structure (Full, Equity, Debt/Equity, Principal, HMA, co-GP). <code className="font-mono">contact</code> = full name. Tags separated by semicolons.</p>
                </div>
              )}

              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                className="v-input resize-none font-mono text-xs"
                rows={8}
                placeholder={`firstName,lastName,email\nJane,Smith,jane@example.com`}
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="v-btn-secondary text-sm flex items-center gap-1.5"
                >
                  <FileText size={14} /> Upload .csv file
                </button>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
                {rawText && <span className="text-xs text-slate-400 dark:text-slate-500">{rawText.split('\n').length - 1} data rows detected</span>}
              </div>
            </>
          )}

          {/* ── Preview ── */}
          {phase === 'preview' && parsed && (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">{parsed.rows.length} rows</span> ready to import. Preview of first 5:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-[var(--border)] overflow-hidden">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                      {parsed.headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-medium border-b border-[var(--border)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {parsed.preview.map((row, i) => (
                      <tr key={i}>
                        {parsed.headers.map(h => (
                          <td key={h} className="px-3 py-1.5 text-slate-700 dark:text-slate-300 max-w-[150px] truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">…and {parsed.rows.length - 5} more rows not shown.</p>
              )}
            </>
          )}

          {/* ── Contact review ── */}
          {phase === 'contact-review' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <UserPlus size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-medium">{unmatchedContacts.length} contact name{unmatchedContacts.length !== 1 ? 's' : ''}</span> in the CSV don't match anyone in your database. Check the ones you'd like to create as new contacts.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-0.5">
                  <span>{Object.values(selectedContacts).filter(Boolean).length} of {unmatchedContacts.length} selected to create</span>
                  <div className="flex gap-3">
                    <button type="button" className="underline hover:text-brand-600" onClick={() => setSelectedContacts(Object.fromEntries(unmatchedContacts.map(u => [u.name, true])))}>Add all</button>
                    <button type="button" className="underline hover:text-brand-600" onClick={() => setSelectedContacts(Object.fromEntries(unmatchedContacts.map(u => [u.name, false])))}>Skip all</button>
                  </div>
                </div>
                <div className="border border-[var(--border)] divide-y divide-slate-100 dark:divide-slate-700 max-h-52 overflow-y-auto">
                  {unmatchedContacts.map(u => (
                    <label key={u.name} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selectedContacts[u.name]}
                        onChange={e => setSelectedContacts(p => ({ ...p, [u.name]: e.target.checked }))}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{u.name}</span>
                      <span className="ml-auto text-[10px] text-slate-400">{u.rows.length} row{u.rows.length !== 1 ? 's' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Importing ── */}
          {phase === 'importing' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 size={28} className="animate-spin text-brand-600" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Importing {parsed.rows.length} rows…</p>
            </div>
          )}

          {/* ── Done ── */}
          {phase === 'done' && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 text-sm font-medium ${errCount === 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {errCount === 0
                  ? <><CheckCircle size={16} /> All {okCount} rows imported successfully.</>
                  : <><AlertCircle size={16} /> {okCount} imported, {errCount} failed.</>
                }
              </div>
              {errCount > 0 && (
                <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {results.map((r, i) => !r.ok && (
                    <p key={i} className="text-red-500 dark:text-red-400">Row {i + 1}: {r.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-2">
          {phase === 'idle' && (
            <>
              <button onClick={onClose} className="v-btn-secondary">Cancel</button>
              <button
                onClick={handlePreview}
                disabled={!rawText.trim()}
                className="v-btn-primary"
              >
                <Upload size={14} /> Preview Import
              </button>
            </>
          )}
          {phase === 'preview' && (
            <>
              <button onClick={() => setPhase('idle')} className="v-btn-secondary">Back</button>
              {entity === 'deals' && (
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer mr-auto">
                  <input type="checkbox" checked={overwriteDeals} onChange={e => setOverwriteDeals(e.target.checked)} className="flex-shrink-0" />
                  Overwrite existing deals (match by name)
                </label>
              )}
              <button onClick={handlePreviewContinue} className="v-btn-primary">
                Import {parsed.rows.length} rows
              </button>
            </>
          )}
          {phase === 'contact-review' && (
            <>
              <button onClick={() => setPhase('preview')} className="v-btn-secondary">Back</button>
              <button onClick={handleContactReviewContinue} className="v-btn-primary">
                Continue
              </button>
            </>
          )}
          {phase === 'done' && (
            <button onClick={onClose} className="v-btn-primary">Done</button>
          )}
        </div>
      </div>
    </div>
  )
}

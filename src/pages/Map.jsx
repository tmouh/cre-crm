import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import { useCRM } from '../context/CRMContext'
import { useTheme } from '../context/ThemeContext'
import { formatDealType, formatDealStatus, DEAL_STATUS_COLORS, DEAL_TYPE_COLORS } from '../utils/helpers'
import clsx from 'clsx'
import { ExternalLink, Loader2, MapPin, AlertCircle } from 'lucide-react'

// Fix Leaflet default icon paths in bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const GEOCODE_CACHE_KEY = 'vanadium_geocode_cache'
const USA_CENTER = [39.5, -98.35]
const USA_ZOOM = 4

// Status → pin color
const STATUS_PIN_COLORS = {
  prospect:         '#6b7280',
  engaged:          '#3b82f6',
  'under-loi':      '#6366f1',
  'under-contract': '#f59e0b',
  'due-diligence':  '#8b5cf6',
  closed:           '#22c55e',
  dead:             '#ef4444',
}

function pinIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="11" fill="${color}" stroke="white" stroke-width="3"/>
      <circle cx="13" cy="13" r="4" fill="white" fill-opacity="0.6"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -18],
  })
}

function loadCache() {
  try { return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}') } catch { return {} }
}
function saveCache(cache) {
  try { localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache)) } catch {}
}

async function geocodeAddress(address) {
  const params = new URLSearchParams({ q: address, format: 'json', limit: '1' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'Accept-Language': 'en' },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

// Fits the map to show all markers, or falls back to USA view
function MapFitter({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (!coords.length) { map.setView(USA_CENTER, USA_ZOOM); return }
    const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng]))
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 13 })
  }, [coords, map])
  return null
}

export default function MapPage() {
  const { properties } = useCRM()
  const { resolvedTheme } = useTheme()
  const [geoDeals, setGeoDeals] = useState([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [failed, setFailed] = useState(0)
  const abortRef = useRef(false)

  const activeDeals = properties.filter(p => p.address)

  useEffect(() => {
    abortRef.current = false
    if (!activeDeals.length) return

    const cache = loadCache()
    const toFetch = activeDeals.filter(p => !cache[p.address])

    setProgress({ done: 0, total: toFetch.length })

    // Seed from cache immediately
    const cached = activeDeals
      .filter(p => cache[p.address])
      .map(p => ({ ...p, ...cache[p.address] }))
    setGeoDeals(cached)

    if (!toFetch.length) return

    let done = 0
    let failCount = 0

    ;(async () => {
      for (const deal of toFetch) {
        if (abortRef.current) break
        const coords = await geocodeAddress(deal.address)
        if (coords) {
          cache[deal.address] = coords
          setGeoDeals(prev => [...prev, { ...deal, ...coords }])
        } else {
          failCount++
          setFailed(failCount)
        }
        done++
        setProgress({ done, total: toFetch.length })
        // Nominatim rate limit: 1 req/sec
        await new Promise(r => setTimeout(r, 1100))
      }
      saveCache(cache)
    })()

    return () => { abortRef.current = true }
  }, [properties])

  const loading = progress.total > 0 && progress.done < progress.total

  const isDark = resolvedTheme === 'dark'
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

  return (
    <div className="relative w-full h-screen">
      {/* Map fills full height */}
      <MapContainer
        center={USA_CENTER}
        zoom={USA_ZOOM}
        className="w-full h-full z-0"
        zoomControl={true}
        minZoom={3}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
      >
        <TileLayer key={resolvedTheme} attribution={tileAttribution} url={tileUrl} noWrap={true} />
        <MapFitter coords={geoDeals} />
        {geoDeals.map(deal => (
          <Marker
            key={deal.id}
            position={[deal.lat, deal.lng]}
            icon={pinIcon(STATUS_PIN_COLORS[deal.status] || '#6b7280')}
          >
            <Popup minWidth={200} maxWidth={260}>
              <div className="font-sans text-[13px] leading-snug py-0.5">
                {/* Header */}
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-[13px] leading-tight mb-1">
                  {deal.name || deal.address}
                </p>
                {deal.name && (
                  <p className="text-slate-400 dark:text-slate-400 text-[11px] mb-2 truncate">
                    {deal.address}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {deal.status && (
                    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', DEAL_STATUS_COLORS[deal.status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                      {formatDealStatus(deal.status)}
                    </span>
                  )}
                  {deal.dealType && (
                    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', DEAL_TYPE_COLORS[deal.dealType] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
                      {formatDealType(deal.dealType)}
                    </span>
                  )}
                </div>

                {/* Deal value */}
                {deal.dealValue && (
                  <p className="text-[12px] text-slate-700 dark:text-slate-300 mb-2">
                    <span className="font-semibold">${Number(deal.dealValue).toLocaleString()}</span>
                    {deal.size && <span className="text-slate-400 dark:text-slate-500 text-[11px]"> · {Number(deal.size).toLocaleString()} {deal.sizeUnit}</span>}
                  </p>
                )}

                {/* Link */}
                <Link
                  to={`/deals/${deal.id}`}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <ExternalLink size={10} /> View deal
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-surface-0 shadow-elevated px-4 py-2 flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300 border border-[var(--border)]">
          <Loader2 size={14} className="animate-spin text-brand-500" />
          Locating deals… {progress.done}/{progress.total}
        </div>
      )}

      {/* No deals empty state */}
      {!loading && activeDeals.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-surface-0/70">
          <div className="text-center">
            <MapPin size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-[12px]">No deals with addresses yet.</p>
            <Link to="/deals" className="mt-2 inline-block text-[12px] text-brand-600 hover:underline dark:text-brand-400">Add a deal</Link>
          </div>
        </div>
      )}

      {/* Failed geocodes warning */}
      {!loading && failed > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 shadow-elevated px-4 py-2 flex items-center gap-2 text-[12px] text-amber-700 dark:text-amber-300">
          <AlertCircle size={13} />
          {failed} address{failed > 1 ? 'es' : ''} could not be located on the map.
        </div>
      )}

      {/* Legend */}
      {geoDeals.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-surface-0/90 backdrop-blur-sm shadow-elevated p-3 border border-[var(--border)] text-[11px]">
          <p className="font-mono font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 text-[10px]">Status</p>
          {Object.entries(STATUS_PIN_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2 mb-1 last:mb-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-slate-600 dark:text-slate-300">{formatDealStatus(status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

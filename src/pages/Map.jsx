import 'leaflet/dist/leaflet.css'
import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import { useCRM } from '../context/CRMContext'
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
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white" fill-opacity="0.85"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38],
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
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 })
  }, [coords, map])
  return null
}

export default function MapPage() {
  const { properties } = useCRM()
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
  }, [properties.length])

  const loading = progress.total > 0 && progress.done < progress.total

  return (
    <div className="relative w-full h-screen">
      {/* Map fills full height */}
      <MapContainer
        center={USA_CENTER}
        zoom={USA_ZOOM}
        className="w-full h-full z-0"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFitter coords={geoDeals} />
        {geoDeals.map(deal => (
          <Marker
            key={deal.id}
            position={[deal.lat, deal.lng]}
            icon={pinIcon(STATUS_PIN_COLORS[deal.status] || '#6b7280')}
          >
            <Popup minWidth={220} maxWidth={280}>
              <div className="font-sans text-[13px] leading-snug py-1">
                {/* Header */}
                <p className="font-semibold text-gray-900 text-[14px] leading-tight mb-0.5">
                  {deal.name || deal.address}
                </p>
                {deal.name && (
                  <p className="text-gray-500 text-[11px] flex items-center gap-1 mb-2">
                    <MapPin size={11} className="flex-shrink-0" /> {deal.address}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {deal.status && (
                    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', DEAL_STATUS_COLORS[deal.status] || 'bg-gray-100 text-gray-600')}>
                      {formatDealStatus(deal.status)}
                    </span>
                  )}
                  {deal.dealType && (
                    <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', DEAL_TYPE_COLORS[deal.dealType] || 'bg-gray-100 text-gray-600')}>
                      {formatDealType(deal.dealType)}
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-1 border-t border-gray-100 pt-2 mt-1">
                  {deal.dealValue && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Deal value</span>
                      <span className="font-medium text-gray-900">${Number(deal.dealValue).toLocaleString()}</span>
                    </div>
                  )}
                  {deal.size && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Size</span>
                      <span className="font-medium text-gray-900">{Number(deal.size).toLocaleString()} {deal.sizeUnit}</span>
                    </div>
                  )}
                </div>

                {/* Link */}
                <Link
                  to={`/properties/${deal.id}`}
                  className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink size={11} /> View deal
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          <Loader2 size={14} className="animate-spin text-brand-500" />
          Locating deals… {progress.done}/{progress.total}
        </div>
      )}

      {/* No deals empty state */}
      {!loading && activeDeals.length === 0 && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
          <div className="text-center">
            <MapPin size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No deals with addresses yet.</p>
            <Link to="/properties" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Add a deal →</Link>
          </div>
        </div>
      )}

      {/* Failed geocodes warning */}
      {!loading && failed > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 shadow-md rounded-lg px-4 py-2 flex items-center gap-2 text-[12px] text-amber-700 dark:text-amber-300">
          <AlertCircle size={13} />
          {failed} address{failed > 1 ? 'es' : ''} could not be located on the map.
        </div>
      )}

      {/* Legend */}
      {geoDeals.length > 0 && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white dark:bg-gray-800 shadow-lg rounded-lg p-3 border border-gray-200 dark:border-gray-600 text-[11px]">
          <p className="font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status</p>
          {Object.entries(STATUS_PIN_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2 mb-1 last:mb-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-600 dark:text-gray-300">{formatDealStatus(status)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

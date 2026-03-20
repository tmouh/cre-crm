import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Video, Clock, Users, Search, ArrowLeft,
  ChevronDown, ChevronRight,
  ExternalLink, Trash2,
} from 'lucide-react'
import { useCRM } from '../context/CRMContext'
import { fullName, formatDate } from '../utils/helpers'
import EmptyState from '../components/EmptyState'

// ─── Date grouping ──────────────────────────────────────────────────────────

function startOfDay(d) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function groupKey(iso) {
  if (!iso) return 'Earlier'
  const d = startOfDay(new Date(iso))
  const now = new Date()
  const today = startOfDay(now)
  const yesterday = startOfDay(new Date(now - 86400000))
  const weekAgo = startOfDay(new Date(now - 7 * 86400000))
  if (d >= today) return 'Today'
  if (d >= yesterday) return 'Yesterday'
  if (d >= weekAgo) return 'This Week'
  return 'Earlier'
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes) {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// ─── Meeting Card (list view) ──────────────────────────────────────────────

function MeetingCard({ meeting, contacts, onClick }) {
  const attendeeNames = (meeting.attendeeContactIds || [])
    .map(id => contacts.find(c => c.id === id))
    .filter(Boolean)
    .map(c => fullName(c))

  const otherEmails = (meeting.attendeeEmails || []).length - attendeeNames.length

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Video size={14} className="text-blue-500 shrink-0" />
            <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {meeting.subject}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatTime(meeting.startAt)}
              {meeting.durationMinutes ? ` · ${formatDuration(meeting.durationMinutes)}` : ''}
            </span>
            {attendeeNames.length > 0 && (
              <span className="flex items-center gap-1">
                <Users size={12} />
                {attendeeNames.slice(0, 3).join(', ')}
                {attendeeNames.length > 3 && ` +${attendeeNames.length - 3}`}
                {otherEmails > 0 && ` +${otherEmails} external`}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── Detail View ──────────────────────────────────────────────────────────

function MeetingDetail({ meeting, contacts, onBack, onDelete }) {
  const [showTranscript, setShowTranscript] = useState(false)

  const attendees = (meeting.attendeeEmails || []).map(email => {
    const contact = contacts.find(c =>
      c.email?.toLowerCase() === email ||
      c.email2?.toLowerCase() === email ||
      c.email3?.toLowerCase() === email
    )
    return { email, contact }
  })

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="os-toolbar">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 ml-4">
          {meeting.joinWebUrl && (
            <a
              href={meeting.joinWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink size={12} /> Open in Teams
            </a>
          )}
          <button
            onClick={() => {
              if (window.confirm(`Delete "${meeting.subject}"? This cannot be undone.`)) {
                onDelete(meeting.id)
              }
            }}
            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Title & meta */}
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Video size={20} className="text-blue-500" />
            {meeting.subject}
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span>{formatDate(meeting.startAt)}</span>
            {meeting.durationMinutes && (
              <span className="flex items-center gap-1">
                <Clock size={14} /> {formatDuration(meeting.durationMinutes)}
              </span>
            )}
          </div>
        </div>

        {/* Attendees */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
            <Users size={14} /> Attendees ({attendees.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {attendees.map(({ email, contact }) => (
              contact ? (
                <Link
                  key={email}
                  to={`/contacts/${contact.id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  {fullName(contact)}
                </Link>
              ) : (
                <span
                  key={email}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                >
                  {email}
                </span>
              )
            ))}
          </div>
        </div>

        {/* Full Transcript (collapsible) */}
        {meeting.transcriptRaw && (
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowTranscript(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span>Full Transcript</span>
              {showTranscript ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {showTranscript && (
              <pre className="p-4 text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 overflow-auto max-h-96 whitespace-pre-wrap font-[Verdana,sans-serif]">
                {meeting.transcriptRaw}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Meetings() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { meetingTranscripts, contacts, deleteMeetingTranscript } = useCRM()
  const [search, setSearch] = useState('')

  // Filter meetings
  const filtered = useMemo(() => {
    if (!search.trim()) return meetingTranscripts
    const q = search.toLowerCase()
    return meetingTranscripts.filter(m =>
      m.subject?.toLowerCase().includes(q) ||
      m.attendeeEmails?.some(e => e.includes(q))
    )
  }, [meetingTranscripts, search])

  // Group by date
  const groups = useMemo(() => {
    const map = {}
    for (const m of filtered) {
      const key = groupKey(m.startAt)
      if (!map[key]) map[key] = []
      map[key].push(m)
    }
    return GROUP_ORDER.filter(k => map[k]?.length).map(k => ({ label: k, items: map[k] }))
  }, [filtered])

  // Detail view
  const selectedMeeting = id ? meetingTranscripts.find(m => m.id === id) : null

  if (selectedMeeting) {
    return (
      <MeetingDetail
        meeting={selectedMeeting}
        contacts={contacts}
        onBack={() => navigate('/meetings')}
        onDelete={async (id) => {
          await deleteMeetingTranscript(id)
          navigate('/meetings')
        }}
      />
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="os-toolbar">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search meetings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {filtered.length} meeting{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {groups.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No meetings yet"
            description="Teams meeting transcripts will appear here automatically after your next sync. Make sure transcription is enabled in your Teams meetings."
          />
        ) : (
          <div className="space-y-6 max-w-3xl">
            {groups.map(group => (
              <div key={group.label}>
                <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  {group.label}
                </h3>
                <div className="space-y-2">
                  {group.items.map(meeting => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      contacts={contacts}
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

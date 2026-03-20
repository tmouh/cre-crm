/**
 * Meeting Transcript Sync Service
 *
 * Scans recent Teams calendar events for completed online meetings, fetches
 * any available transcripts via the Graph Transcripts API, stores them in
 * the meeting_transcripts table, and triggers AI summarization.
 *
 * Runs after every Microsoft sync cycle, similar to dealActivitySync.
 * Uses a localStorage cutoff so only new meetings since the last sync are
 * processed. On first run the cutoff is set to "now" — no back-search.
 */

import {
  getRecentMeetingsFromCalendar,
  getMeetingTranscripts,
  getTranscriptContent,
} from './microsoft'
import { db } from '../lib/supabase'

const LAST_SYNC_KEY = 'ms_last_transcript_sync'

// Track meeting IDs processed in this browser session to avoid re-fetching.
const processedMeetingIds = new Set()

/**
 * Parse VTT transcript into plain readable text (speaker: text lines).
 */
function parseVtt(vtt) {
  if (!vtt) return ''
  return vtt
    .split('\n')
    .filter(line => !line.startsWith('WEBVTT') && !line.startsWith('NOTE') && !/^\d{2}:\d{2}/.test(line) && !/-->/.test(line) && line.trim())
    .join('\n')
    .trim()
}

/**
 * Match attendee emails to CRM contacts.
 * Returns an array of matched contact IDs.
 */
function matchAttendeesToContacts(attendees, contacts) {
  const contactIds = []
  for (const att of attendees) {
    if (!att.email) continue
    const email = att.email.toLowerCase()
    const match = contacts.find(c =>
      c.email?.toLowerCase() === email ||
      c.email2?.toLowerCase() === email ||
      c.email3?.toLowerCase() === email
    )
    if (match) contactIds.push(match.id)
  }
  return contactIds
}

/**
 * Compute meeting duration in minutes from start/end timestamps.
 */
function getDurationMinutes(start, end) {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.round(ms / 60_000)
}

/**
 * Fire-and-forget call to the summarization serverless function.
 */
function triggerSummarization(id, transcriptRaw) {
  fetch('/api/summarize-meeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, transcriptRaw: transcriptRaw.slice(0, 100_000) }),
  }).catch(() => {})
}

/**
 * Main sync entry point. Called after each Microsoft sync completes.
 * @param {object} crmData - { contacts, addMeetingTranscript, updateMeetingTranscript }
 */
export async function syncMeetingTranscripts(crmData) {
  const { contacts, addMeetingTranscript } = crmData

  // Skip if CRM data isn't loaded yet
  if (!contacts?.length) return

  // ── Cutoff: never process meetings older than the last run ────────────
  const stored = localStorage.getItem(LAST_SYNC_KEY)
  const now = new Date()

  if (!stored) {
    localStorage.setItem(LAST_SYNC_KEY, now.toISOString())
    return
  }

  const cutoff = new Date(stored)
  localStorage.setItem(LAST_SYNC_KEY, now.toISOString())

  try {
    const meetings = await getRecentMeetingsFromCalendar(7)

    for (const meeting of meetings) {
      // Need a meeting ID to fetch transcripts
      if (!meeting.meetingId) continue

      // Skip if already processed this session
      if (processedMeetingIds.has(meeting.meetingId)) continue
      processedMeetingIds.add(meeting.meetingId)

      // Skip meetings that ended before the cutoff
      if (meeting.endDateTime && new Date(meeting.endDateTime) < cutoff) continue

      // Skip if already in DB
      const existing = await db.meetingTranscripts.getByMeetingId(meeting.meetingId)
      if (existing) continue

      // Fetch available transcripts
      const transcripts = await getMeetingTranscripts(meeting.meetingId)
      if (!transcripts.length) continue // No transcript yet — will retry next cycle

      // Fetch the first transcript's content
      const rawVtt = await getTranscriptContent(meeting.meetingId, transcripts[0].id)
      if (!rawVtt) continue

      const cleanedText = parseVtt(rawVtt)
      const attendeeContactIds = matchAttendeesToContacts(meeting.attendees, contacts)

      const record = await addMeetingTranscript({
        msMeetingId: meeting.meetingId,
        msEventId: meeting.eventId,
        subject: meeting.subject || '(no subject)',
        startAt: meeting.startDateTime,
        endAt: meeting.endDateTime,
        durationMinutes: getDurationMinutes(meeting.startDateTime, meeting.endDateTime),
        joinWebUrl: meeting.joinUrl,
        attendeeEmails: meeting.attendees.map(a => a.email).filter(Boolean),
        attendeeContactIds,
        transcriptRaw: cleanedText,
        summaryStatus: 'pending',
      }).catch(err => {
        if (!err?.message?.includes('unique') && !err?.message?.includes('duplicate')) {
          console.warn('[MeetingTranscriptSync] insert failed:', err?.message)
        }
        return null
      })

      // Trigger AI summarization
      if (record?.id) {
        triggerSummarization(record.id, cleanedText)
      }
    }
  } catch (err) {
    console.warn('[MeetingTranscriptSync] sync error:', err?.message)
  }
}

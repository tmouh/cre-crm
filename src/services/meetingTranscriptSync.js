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
 * Main sync entry point. Called after each Microsoft sync completes.
 * @param {object} crmData - { contacts, addMeetingTranscript, updateMeetingTranscript }
 */
export async function syncMeetingTranscripts(crmData) {
  const { contacts, addMeetingTranscript } = crmData

  // Skip if CRM data isn't loaded yet
  if (!contacts?.length) return

  // ── Cutoff: on first run, look back 7 days instead of skipping ───────
  const stored = localStorage.getItem(LAST_SYNC_KEY)
  const now = new Date()
  const cutoff = stored ? new Date(stored) : new Date(now.getTime() - 7 * 86_400_000)
  localStorage.setItem(LAST_SYNC_KEY, now.toISOString())

  // Clear session cache so each sync run re-evaluates all meetings
  processedMeetingIds.clear()

  try {
    const meetings = await getRecentMeetingsFromCalendar(7)
    console.log(`[MeetingTranscriptSync] Found ${meetings.length} recent meetings`)

    for (const meeting of meetings) {
      // Need a meeting ID to fetch transcripts
      if (!meeting.meetingId) {
        console.log(`[MeetingTranscriptSync] Skipping "${meeting.subject}" — no meeting ID`)
        continue
      }

      // Skip if already processed this sync cycle (de-dup within a single run)
      if (processedMeetingIds.has(meeting.meetingId)) {
        continue
      }
      processedMeetingIds.add(meeting.meetingId)

      // Skip meetings that ended before the cutoff
      if (meeting.endDateTime && new Date(meeting.endDateTime) < cutoff) {
        console.log(`[MeetingTranscriptSync] Skipping "${meeting.subject}" — ended before cutoff`)
        continue
      }

      // Skip if already in DB
      console.log(`[MeetingTranscriptSync] Checking DB for "${meeting.subject}"...`)
      try {
        const existing = await db.meetingTranscripts.getByMeetingId(meeting.meetingId)
        if (existing) {
          console.log(`[MeetingTranscriptSync] "${meeting.subject}" already in DB, skipping`)
          continue
        }
      } catch (dbErr) {
        console.warn(`[MeetingTranscriptSync] DB check failed for "${meeting.subject}":`, dbErr?.message, '— table may not exist yet. Run the CREATE TABLE SQL in Supabase.')
        continue
      }

      // Fetch available transcripts
      console.log(`[MeetingTranscriptSync] Fetching transcripts for "${meeting.subject}" (${meeting.meetingId})...`)
      try {
        const transcripts = await getMeetingTranscripts(meeting.meetingId)
        console.log(`[MeetingTranscriptSync] "${meeting.subject}" has ${transcripts.length} transcript(s)`)
        if (!transcripts.length) {
          console.log(`[MeetingTranscriptSync] No transcript available yet for "${meeting.subject}" — will retry next cycle`)
          continue
        }

        // Fetch the first transcript's content
        console.log(`[MeetingTranscriptSync] Downloading transcript content for "${meeting.subject}"...`)
        const rawVtt = await getTranscriptContent(meeting.meetingId, transcripts[0].id)
        if (!rawVtt) {
          console.warn(`[MeetingTranscriptSync] Transcript content empty for "${meeting.subject}"`)
          continue
        }

        console.log(`[MeetingTranscriptSync] Got transcript (${rawVtt.length} chars), saving to DB...`)
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
        }).catch(err => {
          if (!err?.message?.includes('unique') && !err?.message?.includes('duplicate') && !err?.message?.includes('409') && !err?.message?.includes('conflict')) {
            console.warn('[MeetingTranscriptSync] insert failed:', err?.message)
          }
          return null
        })

        if (record?.id) {
          console.log(`[MeetingTranscriptSync] ✓ Saved "${meeting.subject}"`)
        }
      } catch (transcriptErr) {
        console.warn(`[MeetingTranscriptSync] Transcript fetch failed for "${meeting.subject}":`, transcriptErr?.message)
      }
    }
  } catch (err) {
    console.warn('[MeetingTranscriptSync] sync error:', err?.message)
  }
}

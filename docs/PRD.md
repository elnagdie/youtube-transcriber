# YouTube Transcriber — Product Requirements Document

**Version:** 1.0 (MVP)
**Date:** 2026-02-27
**Repo:** [elnagdie/youtube-transcriber](https://github.com/elnagdie/youtube-transcriber)

---

## 1. Overview

YouTube Transcriber is a web application that extracts transcripts from YouTube videos, playlists, and channels. Users paste a URL and receive a clean, formatted transcript they can copy to clipboard or download as a markdown file. The app supports batch transcription of entire playlists and channels with progressive display.

---

## 2. Problem Statement

AI practitioners and learners face a recurring bottleneck: YouTube is full of high-quality AI tutorials, but executing those tutorials requires manually watching, pausing, and typing out steps. The typical workflow is:

1. Watch a 30-minute tutorial
2. Pause repeatedly to follow along
3. Miss steps, rewind, repeat

With a transcript, an AI-enabled user can instead:

1. Paste the YouTube URL
2. Get the full transcript in seconds
3. Feed it to an LLM (e.g. Claude, ChatGPT) with a prompt like "Extract the step-by-step instructions from this tutorial and execute them"
4. Intervene only when necessary

### Secondary Use Cases

- **Knowledge extraction:** Scrape transcripts to build trivia games, study materials, or knowledge bases
- **Archival:** Make transcripts of talks by prominent figures searchable and referenceable
- **Batch processing:** Transcribe entire playlists or channels for comprehensive content analysis

---

## 3. User Flows

### Flow 1: Single Video Transcription

1. User lands on homepage
2. Pastes a YouTube video URL into the input field
3. Clicks "Transcribe"
4. App shows a loading state with progress indicator
5. Transcript appears with the video title, channel name, and duration as metadata
6. User can:
   - Copy transcript to clipboard (button)
   - Download as `.md` file
   - Use "Format for LLM" to wrap transcript in a prompt template
   - Search within the transcript (Ctrl+F style)
7. Collapsible "Dev Notes" panel shows technical details

### Flow 2: Playlist/Channel Batch Transcription

1. User pastes a YouTube playlist or channel URL
2. App detects it's a batch URL and shows the list of videos found (title, duration)
3. User clicks "Transcribe All"
4. Transcripts appear progressively as each video completes — a card per video, expanding as results arrive
5. User can:
   - Copy/download individual transcripts
   - Download all as a single `.md` file (concatenated with headers per video)
   - Download all as a `.zip` of individual `.md` files

### Flow 3: LLM-Ready Formatting

1. After a transcript loads, user clicks "Format for LLM"
2. A modal/panel shows preset prompt templates:
   - "Extract step-by-step instructions from this tutorial"
   - "Summarize the key points"
   - "Create a quiz based on this content"
   - Custom (user types their own prompt prefix)
3. User selects a template, the formatted text is copied to clipboard

---

## 4. Technical Architecture

### Frontend (Next.js on Netlify)

- Next.js app with App Router
- Server-side rendering for the landing page (SEO)
- Client-side for the transcription workspace
- Communicates with backend via REST API
- Uses Server-Sent Events (SSE) for progressive playlist updates — backend streams transcript results as they complete
- Dark mode via CSS variables + toggle

### Backend (FastAPI on Railway/Render)

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transcribe` | POST | Accepts a single video URL, returns transcript |
| `/api/batch` | POST | Accepts playlist/channel URL, returns SSE stream of transcripts |
| `/api/detect` | POST | Accepts any YouTube URL, returns type (video/playlist/channel) and metadata |

### Transcription Pipeline

1. Use `yt-dlp` to extract video metadata and check for available captions
2. If captions exist -> extract them directly (fast, ~1-2 seconds)
3. If no captions -> download audio via `yt-dlp`, transcribe with local Whisper (`whisper-small` model)
4. Format transcript as clean text with optional timestamps
5. Return as JSON:

```json
{
  "title": "Video Title",
  "channel": "Channel Name",
  "duration": "12:34",
  "language": "en",
  "transcript": "Full transcript text...",
  "source": "captions | whisper",
  "processing_time_seconds": 2.3
}
```

### Batch Pipeline

1. Use `yt-dlp --flat-playlist` to extract all video URLs from playlist/channel
2. Process videos sequentially (to manage server resources)
3. Stream each result via SSE as it completes
4. Frontend renders each transcript card as it arrives

### Rate Limiting

- IP-based rate limiting via FastAPI middleware
- Single video: 30 requests/hour per IP
- Batch: 5 requests/hour per IP

---

## 5. MVP Features (v1.0)

### Core

- Single video transcription (URL input)
- Playlist/channel batch transcription with progressive display
- YouTube captions extraction (primary method)
- Local Whisper fallback (`whisper-small` model)
- Copy transcript to clipboard
- Download as `.md` file
- Download all (single `.md` or `.zip` for batch)

### Enhancements

- LLM-ready formatting with preset prompt templates
- Multi-language support (auto-detect via yt-dlp/Whisper)
- Search within transcript (client-side text search)
- Dark mode toggle
- Collapsible "Dev Notes" panel per transcript

### Dev Notes Panel Contents

Each transcript card includes a collapsible "Dev Notes" section showing:

- **Transcription source:** YouTube Captions or Whisper
- **Whisper model:** Model name and size (if Whisper was used)
- **Language detected:** Auto-detected language code
- **Processing time:** Time taken to extract/transcribe
- **API endpoint:** Which endpoint was called
- **Rate limit status:** Remaining requests in current window

---

## 6. Future Features (Post-MVP)

- User authentication (Google/GitHub OAuth)
- Transcript history / saved library
- Clickable timestamps with video seek links
- Export to `.srt`, `.json`, `.pdf`, `.txt`
- Public API for developers (with API keys and rate limiting)
- Browser extension for one-click transcription
- Custom Whisper model selection
- Webhook/notification for long batch jobs

---

## 7. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid/malformed URL | Client-side validation before API call. Show inline error message. |
| Private/age-restricted video | yt-dlp returns error. Show "This video is private or restricted." |
| Video has no captions + Whisper fails | Show error with reason. Suggest trying a different video. |
| Playlist with 500+ videos | Show warning: "This playlist has X videos. Processing may take a while." Allow user to proceed or cancel. |
| Deleted/unavailable video in playlist | Skip it, show a "skipped" indicator in the batch results with the reason. |
| Rate limit exceeded | Return HTTP 429 with friendly message and time until rate limit resets. |
| Server timeout (long Whisper transcription) | Timeout at 10 minutes per video. Show progress indicator. If exceeded, return partial result or error. |
| yt-dlp blocked by YouTube | Return clear error message. Suggest retrying later. Log for monitoring. |
| Non-YouTube URL | Validate URL is youtube.com or youtu.be. Reject others with "Only YouTube URLs are supported." |

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Caption-based transcription response time | < 5 seconds |
| Whisper transcription time | < 2x video duration (e.g. 10-min video in < 20 min) |
| Concurrent users | 50+ simultaneous |
| Uptime | 99% (dependent on Railway/Render SLA) |
| Frontend load time | < 2 seconds (Lighthouse score > 90) |
| Mobile responsive | Yes |

---

## 9. Tech Stack Summary

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Frontend | Next.js (App Router) | Netlify |
| Backend | Python FastAPI | Railway or Render |
| Transcription (primary) | yt-dlp (caption extraction) | Backend server |
| Transcription (fallback) | Whisper (whisper-small, local) | Backend server |
| Real-time updates | Server-Sent Events (SSE) | Backend -> Frontend |
| Rate limiting | FastAPI middleware (IP-based) | Backend server |

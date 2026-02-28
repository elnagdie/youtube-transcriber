# YouTube Transcriber — Product Requirements Document

**Version:** 1.1
**Date:** 2026-02-27
**Repo:** [elnagdie/youtube-transcriber](https://github.com/elnagdie/youtube-transcriber)

---

## 1. Overview

YouTube Transcriber is a web application that extracts transcripts from YouTube videos, playlists, and channels. Users paste a URL and receive a clean, formatted transcript with timestamped segments they can copy to clipboard or download as a markdown file. The app supports batch transcription of entire playlists and channels with progressive display.

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
6. Each line has a clickable `[MM:SS]` timestamp that opens YouTube at that moment
7. User can:
   - Copy transcript to clipboard (button)
   - Download as `.md` file
   - Use "Format for LLM" to wrap transcript in a prompt template
   - Search within the transcript with highlighted results
8. Collapsible "Dev Notes" panel shows technical details

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
2. A modal shows preset prompt templates:
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

### Backend (FastAPI on Render)

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/transcribe` | POST | Accepts a single video URL, returns transcript with timestamped segments |
| `/api/batch` | POST | Accepts playlist/channel URL, returns SSE stream of transcripts |
| `/api/detect` | POST | Accepts any YouTube URL, returns type (video/playlist/channel) and metadata |

### Transcription Pipeline

1. Use `yt-dlp` to extract video metadata and check for available captions
2. Find the json3 caption format URL from subtitle data (prefers manual captions over auto-generated)
3. Fetch json3 data directly via URL and parse into timestamped segments
4. Return as JSON:

```json
{
  "title": "Video Title",
  "channel": "Channel Name",
  "duration": "12:34",
  "language": "en",
  "transcript": "Full plain text...",
  "segments": [
    {"time": 0, "text": "welcome to this tutorial"},
    {"time": 15, "text": "today we'll be building..."}
  ],
  "video_id": "dQw4w9WgXcQ",
  "source": "captions",
  "processing_time_seconds": 2.3
}
```

**Note:** Videos without captions (manual or auto-generated) will return a 404 error. There is no audio transcription fallback.

### Batch Pipeline

1. Use `yt-dlp --flat-playlist` to extract all video URLs from playlist/channel
2. Process videos sequentially (to manage server resources)
3. Stream each result via SSE as it completes
4. Frontend renders each transcript card as it arrives

### Rate Limiting

- IP-based rate limiting via FastAPI middleware (slowapi)
- Single video: 30 requests/hour per IP
- Batch: 5 requests/hour per IP

---

## 5. MVP Features (v1.0)

### Core

- Single video transcription (URL input)
- Playlist/channel batch transcription with progressive display
- YouTube captions extraction via yt-dlp (json3 format)
- Timestamped segments with clickable YouTube links
- Copy transcript to clipboard
- Download as `.md` file
- Download all (single `.md` or `.zip` for batch)

### Enhancements

- LLM-ready formatting with preset prompt templates
- Multi-language support (auto-detect via yt-dlp)
- Search within transcript with highlighted results
- Dark mode toggle
- Collapsible "Dev Notes" panel per transcript

### Dev Notes Panel Contents

Each transcript card includes a collapsible "Dev Notes" section showing:

- **Transcription source:** YouTube Captions
- **Language detected:** Auto-detected language code
- **Processing time:** Time taken to extract
- **API endpoint:** Which endpoint was called

---

## 6. Future Features (Post-MVP)

- User authentication (Google/GitHub OAuth)
- Transcript history / saved library
- Export to `.srt`, `.json`, `.pdf`, `.txt`
- Public API for developers (with API keys and rate limiting)
- Browser extension for one-click transcription
- Webhook/notification for long batch jobs
- Speaker diarization (when YouTube adds support)

---

## 7. Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid/malformed URL | Client-side validation before API call. Show inline error message. |
| Private/age-restricted video | yt-dlp returns error. Show "This video is private or restricted." |
| Video has no captions | Show "No captions available for this video." |
| Playlist with 500+ videos | Show warning: "This playlist has X videos. Processing may take a while." Allow user to proceed. |
| Deleted/unavailable video in playlist | Skip it, show a "skipped" indicator in the batch results with the reason. |
| Rate limit exceeded | Return HTTP 429 with friendly message. |
| yt-dlp blocked by YouTube | Return clear error message. Suggest retrying later. |
| Non-YouTube URL | Validate URL is youtube.com or youtu.be. Reject others with "Only YouTube URLs are supported." |

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Caption-based transcription response time | < 5 seconds |
| Concurrent users | 50+ simultaneous |
| Uptime | 99% (dependent on Render SLA) |
| Frontend load time | < 2 seconds (Lighthouse score > 90) |
| Mobile responsive | Yes |

---

## 9. Tech Stack Summary

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Frontend | Next.js (App Router, TypeScript, Tailwind CSS) | Netlify |
| Backend | Python FastAPI | Render |
| Transcription | yt-dlp (caption extraction, json3 format) | Backend server |
| Real-time updates | Server-Sent Events (SSE) | Backend -> Frontend |
| Rate limiting | slowapi (IP-based) | Backend server |

# YouTube Transcriber

Paste a YouTube URL, get the transcript. Supports single videos, playlists, and channels.

## What It Does

- Extract transcripts from any YouTube video using captions (via yt-dlp)
- Timestamped segments with clickable links that jump to that point in the video
- Batch transcribe entire playlists and channels with progressive display
- Copy transcript to clipboard or download as `.md`
- Format transcripts for LLM consumption with preset prompt templates
- Search within transcripts with highlighted results
- Multi-language support (auto-detected)
- Dark mode

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js (TypeScript, Tailwind CSS) |
| Backend | Python FastAPI |
| Transcription | yt-dlp (YouTube caption extraction) |
| Real-time | Server-Sent Events (SSE) |
| Hosting | Netlify (frontend), Render (backend) |

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/detect` | POST | Detect URL type (video/playlist/channel) |
| `/api/transcribe` | POST | Transcribe a single video |
| `/api/batch` | POST | Batch transcribe playlist/channel (SSE stream) |

### Transcribe Response

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

## Deployment

- **Frontend:** Deployed to Netlify. Set `NEXT_PUBLIC_API_URL` env var to the backend URL.
- **Backend:** Deployed to Render via `render.yaml`. See the blueprint in the repo root.

## License

MIT

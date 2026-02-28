# YouTube Transcriber

Paste a YouTube URL, get the transcript. Supports single videos, playlists, and channels.

## What It Does

- Extract transcripts from any YouTube video using captions or Whisper (fallback)
- Batch transcribe entire playlists and channels with progressive display
- Copy transcript to clipboard or download as `.md`
- Format transcripts for LLM consumption with preset prompt templates
- Multi-language support
- Dark mode

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js (TypeScript, Tailwind CSS) |
| Backend | Python FastAPI |
| Transcription | yt-dlp + Whisper (local, open-source) |
| Real-time | Server-Sent Events (SSE) |

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
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

## License

MIT

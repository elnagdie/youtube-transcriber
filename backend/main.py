import json
import time
import tempfile
import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

import yt_dlp

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="YouTube Transcriber API", version="1.0.0")

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return HTTPException(
        status_code=429,
        detail="Rate limit exceeded. Please try again later.",
    )


class TranscribeRequest(BaseModel):
    url: str


class DetectResponse(BaseModel):
    url: str
    type: str  # "video" | "playlist" | "channel"
    title: Optional[str] = None
    video_count: Optional[int] = None
    videos: Optional[list[dict]] = None


class TranscriptResponse(BaseModel):
    title: str
    channel: str
    duration: str
    language: str
    transcript: str
    source: str  # "captions" | "whisper"
    processing_time_seconds: float


def format_duration(seconds: int) -> str:
    """Format seconds into MM:SS or HH:MM:SS."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def extract_captions(url: str) -> dict:
    """Extract captions from a YouTube video using yt-dlp."""
    start_time = time.time()

    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": ["en", "en-orig"],
        "subtitlesformat": "json3",
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

        title = info.get("title", "Unknown")
        channel = info.get("channel", info.get("uploader", "Unknown"))
        duration_secs = info.get("duration", 0)
        duration = format_duration(duration_secs) if duration_secs else "Unknown"

        # Check for available subtitles
        subtitles = info.get("subtitles", {})
        auto_captions = info.get("automatic_captions", {})

        caption_data = None
        language = "en"

        # Try manual subtitles first, then auto-generated
        for lang in ["en", "en-orig", "en-US"]:
            if lang in subtitles:
                caption_data = subtitles[lang]
                language = lang
                break
            if lang in auto_captions:
                caption_data = auto_captions[lang]
                language = lang
                break

        # If no English, try any available language
        if caption_data is None:
            if subtitles:
                language = next(iter(subtitles))
                caption_data = subtitles[language]
            elif auto_captions:
                language = next(iter(auto_captions))
                caption_data = auto_captions[language]

        if caption_data is None:
            return None

        # Download the actual subtitle content
        # Find json3 or srv1 format
        sub_url = None
        for fmt in caption_data:
            if fmt.get("ext") == "json3":
                sub_url = fmt.get("url")
                break
        if sub_url is None:
            for fmt in caption_data:
                sub_url = fmt.get("url")
                if sub_url:
                    break

        if sub_url is None:
            return None

        # Re-extract with subtitle download
        with tempfile.TemporaryDirectory() as tmpdir:
            dl_opts = {
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": [language],
                "subtitlesformat": "vtt",
                "outtmpl": os.path.join(tmpdir, "%(id)s"),
                "quiet": True,
                "no_warnings": True,
            }
            with yt_dlp.YoutubeDL(dl_opts) as ydl2:
                ydl2.download([url])

            # Find and read the subtitle file
            transcript_text = ""
            for f in os.listdir(tmpdir):
                if f.endswith(".vtt"):
                    filepath = os.path.join(tmpdir, f)
                    transcript_text = parse_vtt(filepath)
                    break

            if not transcript_text:
                return None

        processing_time = round(time.time() - start_time, 2)

        return {
            "title": title,
            "channel": channel,
            "duration": duration,
            "language": language,
            "transcript": transcript_text,
            "source": "captions",
            "processing_time_seconds": processing_time,
        }


def parse_vtt(filepath: str) -> str:
    """Parse a VTT subtitle file into clean text."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    text_lines = []
    seen = set()

    for line in lines:
        line = line.strip()
        # Skip VTT headers, timestamps, and empty lines
        if (
            not line
            or line.startswith("WEBVTT")
            or line.startswith("Kind:")
            or line.startswith("Language:")
            or "-->" in line
            or line.replace(".", "").replace(":", "").isdigit()
        ):
            continue
        # Remove HTML tags
        import re

        clean = re.sub(r"<[^>]+>", "", line)
        clean = clean.strip()
        if clean and clean not in seen:
            seen.add(clean)
            text_lines.append(clean)

    return " ".join(text_lines)


def transcribe_with_whisper(url: str) -> dict:
    """Download audio and transcribe with local Whisper model."""
    try:
        import whisper  # noqa: F401
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Whisper is not available on this server. This video has no captions and cannot be transcribed.",
        )

    start_time = time.time()

    with tempfile.TemporaryDirectory() as tmpdir:
        # First get metadata
        meta_opts = {
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(meta_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            title = info.get("title", "Unknown")
            channel = info.get("channel", info.get("uploader", "Unknown"))
            duration_secs = info.get("duration", 0)
            duration = format_duration(duration_secs) if duration_secs else "Unknown"

        # Download audio
        audio_path = os.path.join(tmpdir, "audio.mp3")
        dl_opts = {
            "format": "bestaudio/best",
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
            "outtmpl": os.path.join(tmpdir, "audio"),
            "quiet": True,
            "no_warnings": True,
        }
        with yt_dlp.YoutubeDL(dl_opts) as ydl:
            ydl.download([url])

        # Find the downloaded audio file
        audio_file = None
        for f in os.listdir(tmpdir):
            if f.startswith("audio"):
                audio_file = os.path.join(tmpdir, f)
                break

        if audio_file is None:
            raise HTTPException(status_code=500, detail="Failed to download audio")

        # Transcribe with Whisper
        import whisper

        model = whisper.load_model("small")
        result = model.transcribe(audio_file)

        transcript_text = result.get("text", "")
        language = result.get("language", "unknown")

    processing_time = round(time.time() - start_time, 2)

    return {
        "title": title,
        "channel": channel,
        "duration": duration,
        "language": language,
        "transcript": transcript_text,
        "source": "whisper",
        "processing_time_seconds": processing_time,
    }


def detect_url_type(url: str) -> dict:
    """Detect whether a YouTube URL is a video, playlist, or channel."""
    ydl_opts = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

        if info is None:
            raise HTTPException(status_code=400, detail="Could not extract info from URL")

        result_type = info.get("_type", "video")

        if result_type == "playlist":
            entries = info.get("entries", [])
            videos = []
            for entry in entries:
                if entry:
                    videos.append(
                        {
                            "url": entry.get("url", ""),
                            "title": entry.get("title", "Unknown"),
                            "duration": format_duration(entry.get("duration", 0))
                            if entry.get("duration")
                            else "Unknown",
                        }
                    )
            return {
                "url": url,
                "type": "playlist",
                "title": info.get("title", "Unknown Playlist"),
                "video_count": len(videos),
                "videos": videos,
            }
        else:
            return {
                "url": url,
                "type": "video",
                "title": info.get("title", "Unknown"),
                "video_count": 1,
                "videos": None,
            }


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/detect")
@limiter.limit("30/hour")
async def detect(request: Request, body: TranscribeRequest):
    """Detect URL type (video, playlist, channel) and return metadata."""
    try:
        result = detect_url_type(body.url)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/transcribe")
@limiter.limit("30/hour")
async def transcribe(request: Request, body: TranscribeRequest):
    """Transcribe a single YouTube video."""
    try:
        # Try captions first
        result = extract_captions(body.url)
        if result:
            return result

        # Fallback to Whisper
        result = transcribe_with_whisper(body.url)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/api/batch")
@limiter.limit("5/hour")
async def batch_transcribe(request: Request, body: TranscribeRequest):
    """Transcribe all videos in a playlist/channel. Returns SSE stream."""
    try:
        detection = detect_url_type(body.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if detection["type"] == "video":
        raise HTTPException(
            status_code=400,
            detail="Use /api/transcribe for single videos. This endpoint is for playlists/channels.",
        )

    videos = detection.get("videos", [])
    if not videos:
        raise HTTPException(status_code=404, detail="No videos found in playlist/channel")

    async def event_stream():
        # Send initial metadata
        yield f"data: {json.dumps({'type': 'metadata', 'title': detection['title'], 'video_count': len(videos)})}\n\n"

        for i, video in enumerate(videos):
            video_url = video.get("url", "")
            if not video_url:
                continue

            # Make sure URL is a full YouTube URL
            if not video_url.startswith("http"):
                video_url = f"https://www.youtube.com/watch?v={video_url}"

            try:
                # Try captions first
                result = extract_captions(video_url)
                if result is None:
                    result = transcribe_with_whisper(video_url)

                result["index"] = i
                result["total"] = len(videos)
                yield f"data: {json.dumps({'type': 'transcript', **result})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'index': i, 'total': len(videos), 'title': video.get('title', 'Unknown'), 'error': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

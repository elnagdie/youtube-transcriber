import asyncio
import json
import re
import time
import tempfile
import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
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
    allow_origins=["*"],
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


def format_duration(seconds: int) -> str:
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def parse_vtt(filepath: str) -> str:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    lines = content.split("\n")
    text_lines = []
    seen = set()

    for line in lines:
        line = line.strip()
        if (
            not line
            or line.startswith("WEBVTT")
            or line.startswith("Kind:")
            or line.startswith("Language:")
            or "-->" in line
            or line.replace(".", "").replace(":", "").isdigit()
        ):
            continue
        clean = re.sub(r"<[^>]+>", "", line).strip()
        if clean and clean not in seen:
            seen.add(clean)
            text_lines.append(clean)

    return " ".join(text_lines)


def extract_transcript(url: str) -> dict:
    """Extract captions from a YouTube video using yt-dlp."""
    start_time = time.time()

    # Single yt-dlp call: get metadata and download subtitles in one pass
    with tempfile.TemporaryDirectory() as tmpdir:
        ydl_opts = {
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["en", "en-orig", "en-US"],
            "subtitlesformat": "vtt",
            "outtmpl": os.path.join(tmpdir, "%(id)s"),
            "quiet": True,
            "no_warnings": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            title = info.get("title", "Unknown")
            channel = info.get("channel", info.get("uploader", "Unknown"))
            duration_secs = info.get("duration", 0)
            duration = format_duration(duration_secs) if duration_secs else "Unknown"

            # Check what captions are available
            subtitles = info.get("subtitles", {})
            auto_captions = info.get("automatic_captions", {})

            language = None
            for lang in ["en", "en-orig", "en-US"]:
                if lang in subtitles or lang in auto_captions:
                    language = lang
                    break

            if language is None:
                if subtitles:
                    language = next(iter(subtitles))
                elif auto_captions:
                    language = next(iter(auto_captions))

            if language is None:
                raise HTTPException(
                    status_code=404,
                    detail="No captions available for this video.",
                )

            # Now download the subtitles
            ydl_opts["subtitleslangs"] = [language]
            with yt_dlp.YoutubeDL(ydl_opts) as ydl2:
                ydl2.download([url])

        # Find and parse the VTT file
        transcript_text = ""
        for f in os.listdir(tmpdir):
            if f.endswith(".vtt"):
                transcript_text = parse_vtt(os.path.join(tmpdir, f))
                break

        if not transcript_text:
            raise HTTPException(
                status_code=404,
                detail="No captions available for this video.",
            )

        return {
            "title": title,
            "channel": channel,
            "duration": duration,
            "language": language,
            "transcript": transcript_text,
            "source": "captions",
            "processing_time_seconds": round(time.time() - start_time, 2),
        }


def detect_url_type(url: str) -> dict:
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
                    videos.append({
                        "url": entry.get("url", ""),
                        "title": entry.get("title", "Unknown"),
                        "duration": format_duration(entry.get("duration", 0))
                        if entry.get("duration")
                        else "Unknown",
                    })
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
    try:
        result = await asyncio.to_thread(detect_url_type, body.url)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/transcribe")
@limiter.limit("30/hour")
async def transcribe(request: Request, body: TranscribeRequest):
    try:
        result = await asyncio.to_thread(extract_transcript, body.url)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/api/batch")
@limiter.limit("5/hour")
async def batch_transcribe(request: Request, body: TranscribeRequest):
    try:
        detection = await asyncio.to_thread(detect_url_type, body.url)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if detection["type"] == "video":
        raise HTTPException(
            status_code=400,
            detail="Use /api/transcribe for single videos.",
        )

    videos = detection.get("videos", [])
    if not videos:
        raise HTTPException(status_code=404, detail="No videos found")

    async def event_stream():
        yield f"data: {json.dumps({'type': 'metadata', 'title': detection['title'], 'video_count': len(videos)})}\n\n"

        for i, video in enumerate(videos):
            video_url = video.get("url", "")
            if not video_url:
                continue
            if not video_url.startswith("http"):
                video_url = f"https://www.youtube.com/watch?v={video_url}"

            try:
                result = await asyncio.to_thread(extract_transcript, video_url)
                result["index"] = i
                result["total"] = len(videos)
                yield f"data: {json.dumps({'type': 'transcript', **result})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'index': i, 'total': len(videos), 'title': video.get('title', 'Unknown'), 'error': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

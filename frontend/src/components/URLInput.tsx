"use client";
import { useState } from "react";

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
}

const YOUTUBE_PATTERN = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/;

export default function URLInput({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!YOUTUBE_PATTERN.test(trimmed)) {
      setError("Only YouTube URLs are supported (youtube.com or youtu.be).");
      return;
    }
    setError("");
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          placeholder="Paste a YouTube video, playlist, or channel URL..."
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--fg)] placeholder-[var(--muted)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {loading ? "Processing..." : "Transcribe"}
        </button>
      </div>
      {error && <p className="text-sm text-[var(--accent)]">{error}</p>}
    </form>
  );
}

"use client";
import { useState } from "react";
import type { TranscriptResponse } from "@/lib/types";
import DevNotes from "./DevNotes";
import LLMModal from "./LLMModal";
import { downloadMarkdown } from "@/lib/download";

interface Props {
  transcript: TranscriptResponse;
  endpoint?: string;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function highlightText(text: string, search: string) {
  if (!search.trim()) return text;
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-300 text-black dark:bg-yellow-600 dark:text-white"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function TranscriptCard({
  transcript,
  endpoint = "/api/transcribe",
}: Props) {
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [showLLM, setShowLLM] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(transcript.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderTranscript() {
    const segments = transcript.segments;
    const videoId = transcript.video_id;

    if (segments && segments.length > 0 && videoId) {
      return (
        <div className="space-y-3">
          {segments.map((seg, i) => (
            <div key={i} className="flex gap-3">
              <a
                href={`https://youtube.com/watch?v=${videoId}&t=${seg.time}s`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 font-mono text-xs text-[var(--accent)] hover:underline"
                style={{ minWidth: "3.5rem" }}
              >
                [{formatTimestamp(seg.time)}]
              </a>
              <span>{highlightText(seg.text, search)}</span>
            </div>
          ))}
        </div>
      );
    }

    // Fallback: flat transcript (no segments)
    return highlightText(transcript.transcript, search);
  }

  return (
    <>
      {showLLM && (
        <LLMModal
          transcript={transcript.transcript}
          title={transcript.title}
          onClose={() => setShowLLM(false)}
        />
      )}
      <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold">{transcript.title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {transcript.channel} · {transcript.duration} ·{" "}
            {transcript.language.toUpperCase()}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--bg)]"
          >
            {copied ? "Copied!" : "Copy transcript"}
          </button>
          <button
            onClick={() => downloadMarkdown(transcript)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--bg)]"
          >
            Download .md
          </button>
          <button
            onClick={() => setShowLLM(true)}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--bg)]"
          >
            Format for LLM
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in transcript..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm leading-7 whitespace-pre-wrap">
          {renderTranscript()}
        </div>

        <DevNotes transcript={transcript} endpoint={endpoint} />
      </div>
    </>
  );
}

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
    if (!search.trim()) return transcript.transcript;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = transcript.transcript.split(regex);
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

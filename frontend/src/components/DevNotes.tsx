"use client";
import { useState } from "react";
import type { TranscriptResponse } from "@/lib/types";

interface Props {
  transcript: TranscriptResponse;
  endpoint: string;
}

export default function DevNotes({ transcript, endpoint }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-lg border border-[var(--border)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--fg)]"
      >
        <span>Dev Notes</span>
        <span>{open ? "^" : "v"}</span>
      </button>
      {open && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-[var(--muted)]">Source</dt>
            <dd className="font-mono">{transcript.source}</dd>
            {transcript.source === "whisper" && (
              <>
                <dt className="text-[var(--muted)]">Whisper model</dt>
                <dd className="font-mono">whisper-small</dd>
              </>
            )}
            <dt className="text-[var(--muted)]">Language</dt>
            <dd className="font-mono">{transcript.language}</dd>
            <dt className="text-[var(--muted)]">Processing time</dt>
            <dd className="font-mono">{transcript.processing_time_seconds}s</dd>
            <dt className="text-[var(--muted)]">Endpoint</dt>
            <dd className="font-mono text-xs">{endpoint}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}

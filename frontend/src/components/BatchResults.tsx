"use client";
import type { BatchTranscript, TranscriptResponse } from "@/lib/types";
import TranscriptCard from "./TranscriptCard";
import { downloadAllAsSingleMarkdown, downloadAllAsZip } from "@/lib/download";

interface SkippedVideo {
  index: number;
  title: string;
  error: string;
}

interface Props {
  playlistTitle: string;
  totalVideos: number;
  transcripts: BatchTranscript[];
  skipped: SkippedVideo[];
  done: boolean;
}

export default function BatchResults({
  playlistTitle,
  totalVideos,
  transcripts,
  skipped,
  done,
}: Props) {
  const completed = transcripts.length + skipped.length;
  const progress = totalVideos > 0 ? Math.round((completed / totalVideos) * 100) : 0;

  return (
    <div className="mt-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{playlistTitle}</span>
          <span className="text-[var(--muted)]">
            {completed} / {totalVideos} {done ? "(done)" : "..."}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--border)]">
          <div
            className="h-2 rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {done && transcripts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() =>
              downloadAllAsSingleMarkdown(
                transcripts as TranscriptResponse[],
                playlistTitle
              )
            }
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--surface)]"
          >
            Download all as single .md
          </button>
          <button
            onClick={() => downloadAllAsZip(transcripts as TranscriptResponse[])}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--surface)]"
          >
            Download all as .zip
          </button>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="mb-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
            {skipped.length} video{skipped.length !== 1 ? "s" : ""} skipped:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
            {skipped.map((s) => (
              <li key={s.index}>
                {s.title}: {s.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {transcripts.map((t) => (
        <TranscriptCard key={t.index} transcript={t} endpoint="/api/batch" />
      ))}
    </div>
  );
}

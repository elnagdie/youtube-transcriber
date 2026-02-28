import type { DetectResponse } from "@/lib/types";

interface Props {
  detection: DetectResponse;
  onTranscribeAll: () => void;
  loading: boolean;
}

export default function PlaylistPreview({ detection, onTranscribeAll, loading }: Props) {
  return (
    <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {detection.type === "playlist" ? "Playlist" : "Channel"}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{detection.title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {detection.video_count} video{detection.video_count !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onTranscribeAll}
          disabled={loading}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {loading ? "Processing..." : "Transcribe All"}
        </button>
      </div>

      {detection.video_count !== null && detection.video_count > 500 && (
        <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400">
          This playlist has {detection.video_count} videos. Processing may take a while.
        </div>
      )}

      {detection.videos && (
        <ul className="max-h-64 divide-y divide-[var(--border)] overflow-y-auto rounded-lg border border-[var(--border)]">
          {detection.videos.map((v, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="truncate pr-4 text-[var(--fg)]">{v.title}</span>
              <span className="shrink-0 text-[var(--muted)]">{v.duration}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

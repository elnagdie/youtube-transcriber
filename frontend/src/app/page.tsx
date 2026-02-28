"use client";
import { useState } from "react";
import URLInput from "@/components/URLInput";
import ThemeToggle from "@/components/ThemeToggle";
import PlaylistPreview from "@/components/PlaylistPreview";
import TranscriptCard from "@/components/TranscriptCard";
import BatchResults from "@/components/BatchResults";
import { detectURL, transcribeVideo, fetchBatchStream } from "@/lib/api";
import type { DetectResponse, TranscriptResponse, BatchTranscript } from "@/lib/types";

type AppState = "idle" | "detecting" | "detected" | "transcribing" | "done" | "error";

interface SkippedVideo {
  index: number;
  title: string;
  error: string;
}

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [detection, setDetection] = useState<DetectResponse | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [batchTranscripts, setBatchTranscripts] = useState<BatchTranscript[]>([]);
  const [batchSkipped, setBatchSkipped] = useState<SkippedVideo[]>([]);
  const [batchTitle, setBatchTitle] = useState("");
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentURL, setCurrentURL] = useState("");

  async function handleSubmit(url: string) {
    setCurrentURL(url);
    setState("detecting");
    setErrorMsg("");
    setDetection(null);
    setTranscript(null);
    setBatchTranscripts([]);
    setBatchSkipped([]);
    setBatchDone(false);

    try {
      const result: DetectResponse = await detectURL(url);
      setDetection(result);
      if (result.type === "video") {
        setState("transcribing");
        const tx: TranscriptResponse = await transcribeVideo(url);
        setTranscript(tx);
        setState("done");
      } else {
        setState("detected");
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }

  async function handleTranscribeAll() {
    if (!currentURL) return;
    setState("transcribing");
    setBatchTranscripts([]);
    setBatchSkipped([]);
    setBatchDone(false);

    try {
      for await (const event of fetchBatchStream(currentURL)) {
        if (event.type === "metadata") {
          setBatchTitle(event.title ?? "");
          setBatchTotal(event.video_count ?? 0);
        } else if (event.type === "transcript") {
          const tx: BatchTranscript = {
            title: event.title ?? "",
            channel: event.channel ?? "",
            duration: event.duration ?? "",
            language: event.language ?? "",
            transcript: event.transcript ?? "",
            segments: event.segments ?? [],
            video_id: event.video_id ?? "",
            source: event.source ?? "captions",
            processing_time_seconds: event.processing_time_seconds ?? 0,
            index: event.index ?? 0,
            total: event.total ?? 0,
          };
          setBatchTranscripts((prev) => [...prev, tx]);
        } else if (event.type === "error") {
          setBatchSkipped((prev) => [
            ...prev,
            {
              index: event.index ?? 0,
              title: event.title ?? "Unknown",
              error: event.error ?? "Unknown error",
            },
          ]);
        } else if (event.type === "done") {
          setBatchDone(true);
          setState("done");
        }
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Batch transcription failed.");
      setState("error");
    }
  }

  const isBatch =
    detection && (detection.type === "playlist" || detection.type === "channel");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">YouTube Transcriber</h1>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-3xl font-bold tracking-tight">
            Extract YouTube Transcripts
          </h2>
          <p className="text-[var(--muted)]">
            Paste a video, playlist, or channel URL to get a clean, copy-ready transcript.
          </p>
        </div>

        <URLInput
          onSubmit={handleSubmit}
          loading={state === "detecting" || (state === "transcribing" && !isBatch)}
        />

        {state === "detecting" && (
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Detecting URL type...
          </p>
        )}
        {state === "transcribing" && !isBatch && (
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Transcribing... this may take a moment.
          </p>
        )}

        {state === "error" && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {isBatch && state === "detected" && (
          <PlaylistPreview
            detection={detection}
            onTranscribeAll={handleTranscribeAll}
            loading={false}
          />
        )}

        {isBatch && (state === "transcribing" || state === "done") && (
          <BatchResults
            playlistTitle={batchTitle}
            totalVideos={batchTotal}
            transcripts={batchTranscripts}
            skipped={batchSkipped}
            done={batchDone}
          />
        )}

        {transcript && <TranscriptCard transcript={transcript} />}
      </main>
    </div>
  );
}

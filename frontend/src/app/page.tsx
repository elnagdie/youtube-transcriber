"use client";
import { useState } from "react";
import URLInput from "@/components/URLInput";
import ThemeToggle from "@/components/ThemeToggle";
import PlaylistPreview from "@/components/PlaylistPreview";
import TranscriptCard from "@/components/TranscriptCard";
import { detectURL, transcribeVideo } from "@/lib/api";
import type { DetectResponse, TranscriptResponse } from "@/lib/types";

type AppState = "idle" | "detecting" | "detected" | "transcribing" | "done" | "error";

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [detection, setDetection] = useState<DetectResponse | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentURL, setCurrentURL] = useState("");

  async function handleSubmit(url: string) {
    setCurrentURL(url);
    setState("detecting");
    setErrorMsg("");
    setDetection(null);
    setTranscript(null);
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

  function handleTranscribeAll() {
    setState("transcribing");
    // batch wired in Task 7
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">YouTube Transcriber</h1>
        <ThemeToggle />
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 text-center">
          <h2 className="mb-2 text-3xl font-bold tracking-tight">Extract YouTube Transcripts</h2>
          <p className="text-[var(--muted)]">
            Paste a video, playlist, or channel URL to get a clean, copy-ready transcript.
          </p>
        </div>

        <URLInput
          onSubmit={handleSubmit}
          loading={state === "detecting" || state === "transcribing"}
        />

        {state === "detecting" && (
          <p className="mt-6 text-center text-sm text-[var(--muted)]">Detecting URL type...</p>
        )}
        {state === "transcribing" && !detection?.type?.includes("playlist") && !detection?.type?.includes("channel") && (
          <p className="mt-6 text-center text-sm text-[var(--muted)]">Transcribing... this may take a moment.</p>
        )}

        {state === "error" && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {detection && (detection.type === "playlist" || detection.type === "channel") && state !== "transcribing" && (
          <PlaylistPreview
            detection={detection}
            onTranscribeAll={handleTranscribeAll}
            loading={false}
          />
        )}

        {transcript && <TranscriptCard transcript={transcript} />}
      </main>
    </div>
  );
}

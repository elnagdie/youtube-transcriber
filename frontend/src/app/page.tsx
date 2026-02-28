"use client";
import { useState } from "react";
import URLInput from "@/components/URLInput";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const [loading, setLoading] = useState(false);

  function handleSubmit(url: string) {
    setLoading(true);
    console.log("URL submitted:", url);
    setTimeout(() => setLoading(false), 1000);
  }

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
        <URLInput onSubmit={handleSubmit} loading={loading} />
      </main>
    </div>
  );
}

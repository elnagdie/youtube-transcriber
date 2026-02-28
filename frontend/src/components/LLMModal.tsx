"use client";
import { useState } from "react";

interface Props {
  transcript: string;
  title: string;
  onClose: () => void;
}

const TEMPLATES = [
  {
    label: "Extract step-by-step instructions",
    prefix: "Extract the step-by-step instructions from this tutorial transcript and present them as a numbered list:\n\n",
  },
  {
    label: "Summarize key points",
    prefix: "Summarize the key points from this transcript in bullet form:\n\n",
  },
  {
    label: "Create a quiz",
    prefix: "Create a 5-question multiple-choice quiz based on this transcript:\n\n",
  },
  { label: "Custom prompt...", prefix: "" },
];

export default function LLMModal({ transcript, title, onClose }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customPrefix, setCustomPrefix] = useState("");
  const [copied, setCopied] = useState(false);

  const isCustom = selectedIndex === TEMPLATES.length - 1;
  const prefix = isCustom ? customPrefix : TEMPLATES[selectedIndex].prefix;
  const formatted = `${prefix}---\nTitle: ${title}\n\n${transcript}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="font-semibold">Format for LLM</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]">x</button>
        </div>
        <div className="px-6 py-4">
          <p className="mb-3 text-sm text-[var(--muted)]">Choose a prompt template:</p>
          <div className="flex flex-col gap-2">
            {TEMPLATES.map((t, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3 text-sm hover:border-[var(--accent)]"
              >
                <input
                  type="radio"
                  name="template"
                  checked={selectedIndex === i}
                  onChange={() => setSelectedIndex(i)}
                  className="accent-[var(--accent)]"
                />
                {t.label}
              </label>
            ))}
          </div>
          {isCustom && (
            <textarea
              value={customPrefix}
              onChange={(e) => setCustomPrefix(e.target.value)}
              placeholder="Your custom prompt prefix..."
              className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              rows={3}
            />
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white"
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

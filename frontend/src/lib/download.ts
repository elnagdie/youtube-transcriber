import JSZip from "jszip";
import type { TranscriptResponse } from "./types";

function transcriptToMarkdown(t: TranscriptResponse): string {
  return `# ${t.title}\n\n**Channel:** ${t.channel}  \n**Duration:** ${t.duration}  \n**Language:** ${t.language}  \n**Source:** ${t.source}  \n\n---\n\n${t.transcript}\n`;
}

export function downloadMarkdown(t: TranscriptResponse): void {
  const content = transcriptToMarkdown(t);
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${t.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAllAsZip(
  transcripts: TranscriptResponse[]
): Promise<void> {
  const zip = new JSZip();
  for (const t of transcripts) {
    const filename = `${t.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    zip.file(filename, transcriptToMarkdown(t));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transcripts.zip";
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadAllAsSingleMarkdown(
  transcripts: TranscriptResponse[],
  playlistTitle: string
): void {
  const content = transcripts.map(transcriptToMarkdown).join("\n\n---\n\n");
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${playlistTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

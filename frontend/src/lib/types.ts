export type URLType = "video" | "playlist" | "channel";

export interface DetectResponse {
  url: string;
  type: URLType;
  title: string | null;
  video_count: number | null;
  videos: { url: string; title: string; duration: string }[] | null;
}

export interface TranscriptResponse {
  title: string;
  channel: string;
  duration: string;
  language: string;
  transcript: string;
  segments: { time: number; text: string }[];
  video_id: string;
  source: "captions" | "whisper";
  processing_time_seconds: number;
}

export interface BatchEvent {
  type: "metadata" | "transcript" | "error" | "done";
  title?: string;
  video_count?: number;
  index?: number;
  total?: number;
  channel?: string;
  duration?: string;
  language?: string;
  transcript?: string;
  segments?: { time: number; text: string }[];
  video_id?: string;
  source?: "captions" | "whisper";
  processing_time_seconds?: number;
  error?: string;
}

export interface BatchTranscript extends TranscriptResponse {
  index: number;
  total: number;
}

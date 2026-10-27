// Pass 01: every spoken word of one clip with its start and end, from local
// Whisper (small.en, downloaded once into models/). Nothing leaves your machine.
//   node scripts/transcribe.mjs public/footage/take1.mp4 reel/take1.json
// Output: { source, words: [{ text, startInSeconds, endInSeconds }] }, the
// `transcript` input of scripts/cut-talking-head.mjs. Whisper's word times can
// be ~0.3 s off: correct the text by hand, and put cuts in measured silence.
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [input, output] = process.argv.slice(2);
if (!output) {
  console.error("Usage: node scripts/transcribe.mjs <clip> <out.json>");
  process.exit(1);
}
const SR = 16000;
const raw = execFileSync("ffmpeg", ["-v", "error", "-i", input, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], {
  maxBuffer: 1 << 30,
});
const pcm = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));

const { env } = await import("@huggingface/transformers");
const { downloadWhisperModel, loadWhisperModel, transcribe } = await import("@remotion/whisper-webgpu");
env.cacheDir = resolve("models");
await mkdir(env.cacheDir, { recursive: true });
const model = "small.en";
await downloadWhisperModel({ model, onProgress: () => {} });
const handle = await loadWhisperModel({ model });
try {
  const result = await transcribe({ channelWaveform: pcm, model });
  const words = result.words
    .filter((w) => w.text.trim() && !/^\s*[[(].*[\])]\s*$/.test(w.text))
    .map((w, i) => ({
      text: (i ? " " : "") + w.text.trim(),
      startInSeconds: +w.startInSeconds.toFixed(3),
      endInSeconds: +w.endInSeconds.toFixed(3),
    }));
  await writeFile(output, `${JSON.stringify({ source: input, words }, null, 1)}\n`);
  console.log(`${output}: ${words.length} words`);
  console.log(words.map((w) => w.text).join(""));
} finally {
  await handle[Symbol.asyncDispose]();
}

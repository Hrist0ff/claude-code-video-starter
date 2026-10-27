// Pass 01 for talking-head clips: cut picture, sound and cut-out with the same
// frame ranges, then write words.json, the reel's one timing manifest.
// Usage: node scripts/cut-talking-head.mjs reel/cut.json   (npm run cut)
//
// cut.json: { fps, out, words, fix, clips: [{ id, src, transcript, cutout?,
// in?, out?, remove?: [[start, end], ...] }] }. Times are source seconds.
// `fix` corrects words by ID ("c1-036": "path."); null merges a word into
// the one before it. Word IDs come from the source transcript, so they stay
// the same when the cuts change.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const spec = JSON.parse(readFileSync(process.argv[2], "utf8"));
const { fps } = spec;
const fail = (msg) => {
  throw new Error(msg);
};
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) fail(`${cmd} failed:\n${r.stderr.slice(-2000)}`);
  return r.stdout;
};
const frames = (t) => Math.round(t * fps);
// Count video frames, not the file duration: the audio often runs a little longer.
const videoFrames = (file) =>
  Number(
    run("ffprobe", [
      "-v", "error", "-select_streams", "v:0", "-count_packets",
      "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", file,
    ]),
  );

// Kept segments in source frames, placed one after another on the output timeline.
const segments = [];
let cursor = 0;
for (const clip of spec.clips) {
  const from = frames(clip.in ?? 0);
  const to = clip.out === undefined ? videoFrames(clip.src) : frames(clip.out);
  const remove = (clip.remove ?? []).map(([a, b]) => [frames(a), frames(b)]);
  let start = from;
  for (const [a, b] of remove) {
    if (a < start || b > to || b <= a) fail(`${clip.id}: bad or unsorted cut ${a}–${b}`);
    segments.push({ clip: clip.id, srcStartFrame: start, srcEndFrame: a });
    start = b;
  }
  segments.push({ clip: clip.id, srcStartFrame: start, srcEndFrame: to });
  clip.outStartFrame = cursor;
  for (const s of segments.filter((s) => s.clip === clip.id && s.startFrame === undefined)) {
    s.startFrame = cursor;
    cursor += s.srcEndFrame - s.srcStartFrame;
    s.endFrame = cursor;
  }
}
const durationInFrames = cursor;

// Whisper word times drift by up to ~0.3 s. Measured pauses (under −40 dB for
// 0.2 s or more) move phrase edges onto the real sound: an end that runs into a
// pause stops where it starts, and the first word after a pause starts where it
// ends. A word that would get shorter than 0.1 s was placed late as a whole, so
// it moves back and trims the word before it.
const pauses = (file) => {
  const log = spawnSync("ffmpeg", ["-v", "info", "-i", file, "-vn", "-af", "silencedetect=noise=-40dB:d=0.2", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  // A clip that opens in silence reports silence_start: -0.000125; missing it would shift every pair.
  const t = [...log.matchAll(/silence_(?:start|end): (-?[\d.]+)/g)].map((m) => Math.max(0, Number(m[1])));
  return Array.from({ length: Math.floor(t.length / 2) }, (_, k) => [t[2 * k], t[2 * k + 1]]);
};
const snap = (raw, file) => {
  for (const [s, e] of pauses(file)) {
    const next = raw.findIndex((w) => w.a >= s);
    const p = next < 0 ? raw.length - 1 : next - 1;
    if (p >= 0 && raw[p].b > s) {
      raw[p].b = s;
      raw[p].a = Math.min(raw[p].a, s - 0.1);
      if (p > 0) raw[p - 1].b = Math.min(raw[p - 1].b, raw[p].a);
    }
    if (next >= 0 && raw[next].a < e + 0.4 && raw[next].b - e >= 0.1) raw[next].a = e;
  }
  return raw;
};

// Words, mapped from source time to output time. A word inside a cut is an error.
const words = [];
for (const clip of spec.clips) {
  const own = segments.filter((s) => s.clip === clip.id);
  const map = (t) => {
    const s = own.find((s) => t * fps >= s.srcStartFrame - 0.5 && t * fps <= s.srcEndFrame + 0.5);
    return s && (s.startFrame - s.srcStartFrame) / fps + t;
  };
  const raw = JSON.parse(readFileSync(clip.transcript, "utf8")).words.map((w) => ({
    text: w.text,
    a: w.startInSeconds,
    b: w.endInSeconds,
  }));
  snap(raw, clip.src).forEach((w, i) => {
    const id = `${clip.id}-${String(i).padStart(3, "0")}`;
    const { a, b } = w;
    if (b * fps <= frames(clip.in ?? 0) || a * fps >= own.at(-1).srcEndFrame) return;
    const start = map(a);
    const end = map(b);
    if (start === undefined || end === undefined || end - start > b - a + 0.001) {
      fail(`${id} "${w.text.trim()}" (${a}–${b} s) touches a cut or the clip edge`);
    }
    words.push({ id, text: w.text.trim(), start, end });
  });
}
for (const [id, text] of Object.entries(spec.fix ?? {})) {
  const i = words.findIndex((w) => w.id === id);
  if (i < 0) fail(`fix: no word ${id}`);
  if (text === null) {
    if (i === 0) fail(`fix: ${id} has no word before it to merge into`);
    words[i - 1].end = words[i].end;
    words.splice(i, 1);
  } else words[i].text = text;
}
const manifest = words.map((w) => ({
  id: w.id,
  text: w.text,
  start: Number(w.start.toFixed(3)),
  end: Number(w.end.toFixed(3)),
  startFrame: frames(w.start),
  endFrame: Math.max(frames(w.end), frames(w.start) + 1), // exclusive
}));
manifest.forEach((w, i) => {
  if (w.endFrame > durationInFrames) fail(`${w.id} ends after the reel`);
  if (i && w.start < manifest[i - 1].start) fail(`${w.id} is out of order`);
});
if (new Set(manifest.map((w) => w.id)).size !== manifest.length) fail("duplicate word IDs");

// Picture and sound: hard picture cuts; 8 ms sound fades stop clicks at the joins.
mkdirSync(spec.out, { recursive: true });
const inputs = spec.clips.flatMap((c) => ["-i", c.src]);
const parts = segments.map((s, k) => {
  const i = spec.clips.findIndex((c) => c.id === s.clip);
  const [a, b] = [s.srcStartFrame / fps, s.srcEndFrame / fps];
  return (
    `[${i}:v]trim=start_frame=${s.srcStartFrame}:end_frame=${s.srcEndFrame},setpts=PTS-STARTPTS[v${k}];` +
    `[${i}:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,` +
    `afade=t=in:d=0.008,afade=t=out:st=${(b - a - 0.008).toFixed(3)}:d=0.008[a${k}]`
  );
});
const joined = segments.map((_, k) => `[v${k}][a${k}]`).join("");
const cut = `${spec.out}/cut.mp4`;
run("ffmpeg", [
  "-v", "error", "-y", ...inputs,
  "-filter_complex", `${parts.join(";")};${joined}concat=n=${segments.length}:v=1:a=1[v][a]`,
  "-map", "[v]", "-map", "[a]", "-r", String(fps),
  "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p",
  "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-c:a", "aac", "-b:a", "192k", cut,
]);

// Clean voice for the reel: a high-pass and gentle compression (add a denoise
// step for a noisy room), then two passes of loudness to −14 LUFS, linear so the
// delivery keeps its dynamics.
// Stereo before measuring: a mono file played on both channels reads 3 LU louder.
const chain = "aformat=channel_layouts=stereo,highpass=f=80,acompressor=threshold=-24dB:ratio=2:attack=12:release=220:makeup=1";
// TP −2 leaves room for sound effects and AAC encoding: the mix must stay at −1.5 dBTP or below.
const target = "loudnorm=I=-14:TP=-2:LRA=7";
const measured = spawnSync("ffmpeg", ["-hide_banner", "-i", cut, "-vn", "-af", `${chain},${target}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
const m = JSON.parse(measured.slice(measured.lastIndexOf("{"), measured.lastIndexOf("}") + 1));
run("ffmpeg", [
  "-v", "error", "-y", "-i", cut, "-vn",
  "-af", `${chain},${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
  "-ar", "48000", "-c:a", "pcm_s16le", `${spec.out}/voice.wav`,
]);

// Cut-out per clip, with the same frames, so it stays aligned to the picture.
for (const clip of spec.clips.filter((c) => c.cutout)) {
  const own = segments.filter((s) => s.clip === clip.id);
  const trims = own.map(
    (s, k) => `[0:v]trim=start_frame=${s.srcStartFrame}:end_frame=${s.srcEndFrame},setpts=PTS-STARTPTS[c${k}]`,
  );
  run("ffmpeg", [
    "-v", "error", "-y", "-c:v", "libvpx-vp9", "-i", clip.cutout,
    "-filter_complex", `${trims.join(";")};${own.map((_, k) => `[c${k}]`).join("")}concat=n=${own.length}:v=1:a=0[c]`,
    "-map", "[c]", "-r", String(fps), "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
    "-crf", "28", "-b:v", "0", `${spec.out}/${clip.id}-cutout.webm`,
  ]);
}

// Check: the picture and each cut-out have exactly the frames the manifest says.
const got = videoFrames(cut);
if (got !== durationInFrames) fail(`cut.mp4 has ${got} frames, expected ${durationInFrames}`);
for (const clip of spec.clips.filter((c) => c.cutout)) {
  const want = segments
    .filter((s) => s.clip === clip.id)
    .reduce((n, s) => n + s.srcEndFrame - s.srcStartFrame, 0);
  const have = videoFrames(`${spec.out}/${clip.id}-cutout.webm`);
  if (have !== want) fail(`${clip.id}-cutout.webm has ${have} frames, expected ${want}`);
}

const clips = Object.fromEntries(spec.clips.map((c) => [c.id, { startFrame: c.outStartFrame }]));
writeFileSync(spec.words, `${JSON.stringify({ fps, durationInFrames, clips, segments, words: manifest }, null, 1)}\n`);
console.log(`${cut}: ${durationInFrames} frames (${(durationInFrames / fps).toFixed(2)} s), ${segments.length} segments`);
console.log(`${spec.words}: ${manifest.length} words. Check them in Studio: Timing-Check.`);

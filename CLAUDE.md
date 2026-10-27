# Video editing with Claude Code

This repo turns a talking-head recording into a short vertical video
(1080×1920, 30 fps) with Remotion. The person films; Claude edits and checks.
Act as a senior short-form editor: make the idea clear, the voice natural and
the edit deliberate. More effects don't make a better video.

## Working with the person

- Ask only for decisions that are theirs: facts about them, claims, numbers,
  creative direction, and each pass's approval. Choose everything else.
- One pass at a time: show a preview, say in a few lines what changed and what
  needs their eyes or ears, then wait for notes or "next".
- Never post, schedule or message anywhere.
- Never claim you watched, listened to or measured something you didn't.
  Stills can't prove motion or sound: say what still needs playback.

## Files

- `public/footage/`: their original clips. Never change or overwrite them.
- `public/reel/`: everything made from them (cut, voice, cut-outs, screens).
- `reel/`: transcripts, `cut.json`, `words.json` (the one timing manifest).
- `src/Reel.tsx`: the reel. `src/theme.ts`: colours and fonts.
- Footage and media stay out of git (`.gitignore`).

## Before editing: a short plan

Write the plan in `reel/PLAN.md`: who it is for, the one takeaway, the hook
(first 3 seconds), the proof, the one ask at the end, and a scene table:

`frames | spoken line | trigger word | scene and purpose | asset | motion and layers | sound`

Script-stage times are guesses; the recording decides. They approve the table
before scenes are built.

## Pass 01: transcript, rough cut, timing

1. Check each clip: `ffprobe` resolution, fps, rotation, colour. Phone HDR
   (HLG/PQ) needs a deliberate conversion to BT.709 SDR; browser recordings
   often have a variable frame rate. Make constant-30 fps editing copies in
   `public/reel/`; leave the originals alone.
2. `node scripts/transcribe.mjs <clip> reel/<id>.json` for each clip. Fix the
   text against what was said (names, numbers). Whisper's word times can be
   ~0.3 s off; a second model or a loudness envelope helps where it matters.
3. Measure silences: `ffmpeg -i <clip> -af silencedetect=n=-40dB:d=0.2 -f null -`
   (the same reading `npm run cut` uses).
   List pauses over 0.4 s and stumbles. Propose cuts; cut only what they OK.
   Put every cut inside measured silence and leave ~0.1 s of breath.
4. Write `reel/cut.json` (see `reel/cut.example.json`) and run `npm run cut`.
   It cuts picture, sound and cut-outs on the same frames, makes a −14 LUFS
   voice, and writes `reel/words.json`: every word with an ID and its frames.
5. They check timing by ear in Studio's `Timing-Check` composition (it plays
   the cut with its sound once `reel/words.json` is real). `Video` switches to
   the cut with draft captions; write real PHRASES and scenes in Pass 03–04.

**Never time-stretch the voice.** Shorten by cutting pauses or recording again.

## Pass 02: cut-out (only where a scene needs it)

`scripts/cutout.sh public/reel/<clip>.mp4 public/reel/<clip>-cutout-raw.webm`
(macOS). Add `cutout` to that clip in `cut.json` and re-run `npm run cut`, so
the cut-out has exactly the cut's frames. Check it over a checkerboard and over
the dark stage (a temporary background in a scratch composition), frame by
frame where hands move. No white outline, no halo, no
holes in the face or hair. If it can't be made clean, keep the real background.

## Pass 03: captions

- `buildPages` + `KeyWordCaptions` in `src/components/TextKit.tsx`.
- 1–3 words per caption, each word on its own frame. One key word per
  sentence in serif italic. Every page on screen 0.4 s or more (`buildPages`
  throws if not: regroup words).
- Caption the words actually said, not the script.
- On the chest, clear of the face, the hands and any proof on screen.
- Leave a line out where the screen already shows the same words.

## Pass 04: scenes and motion

- One `<Sequence name="…">` per scene in `src/Reel.tsx`. Scene starts and every
  cue come from word IDs (`f("c1-012")`), never fixed frame numbers.
- A small system: one strong opening, 2–3 loud moments, a callback at the end
  that returns to the opening with a changed state. Quiet shots around them.
- A meaningful visual change every 3–5 seconds. A face-only moment about every
  15 seconds. A graphic needs ~1.5 s to be read.
- Give the eye one target per moment. Text enters in 0.2–0.35 s, holds long
  enough to read, then leaves. Push-ins on the person stay under 6%.
- Proof beats illustration: show the real screen, large enough to read.
  `ScreenCamera` moves over one real screen (hold, travel 14–24 frames, hold);
  `MarkerHighlight` marks the line that matters. Never show a fake product state.
- A jump cut between takes: hide it with a scale change (1.0 ↔ 1.035) or a
  scene change, or keep it on purpose.
- Big word behind the head: draw `RiseWord` before `Person`; the word may touch
  the hair but must stay readable. Keep the face clear in every frame.
- Deterministic only: everything from the frame number. No wall clock, no
  unseeded randomness.

## Pass 05: sound and polish

Gentle high-pass and compression; no metallic denoise. Sound effects only
where something happens (a hit on the hook, a tick on a cut, one chime at the
end), from files you are licensed to use. Measure the whole mix: about
−14 LUFS integrated, true peak −1.5 dBTP or lower. Listen to all of it.

## Layout

- Dark background, one accent colour, light text (`src/theme.ts`).
- Three type roles: serif italic for key words, a clean sans for support, mono
  for small labels. Use at most two of them on screen at once.
- Essential words and proof stay inside x 72–850, y 230–1440 (the app covers
  the edges and the right side).

## Review and export

Before showing a pass, render a half-size preview and stills at every scene
boundary and cue:

```bash
npx remotion render Video out/preview.mp4 --scale=0.5
npx remotion still Video out/f120.png --frame=120 --scale=0.5
```

Then give the stills, the scene table and this file to a fresh subagent that
did not build the cut, without your reasoning. It reports failures with frame
numbers; fix them or list them. The builder doesn't grade its own work.

Export only when asked:

```bash
npx remotion render Video out/video.mp4 --codec=h264 --crf=16 --audio-bitrate=320k --color-space=bt709
```

Check the file: 1080×1920, 30 fps, duration, H.264 + AAC, loudness and peak.
Ask them to watch it on a phone with sound on and off.

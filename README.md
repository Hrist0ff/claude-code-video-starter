# claude-code-video-starter

Edit talking-head videos with [Claude Code](https://claude.com/claude-code) and
[Remotion](https://www.remotion.dev). No video editor: you record, Claude Code
writes the edit as React code.

What it does with your clips:

- writes down every word with its frames (local Whisper, nothing uploaded;
  you check the timing by ear)
- cuts the pauses you approve, inside the measured silence
- cuts you out of your room (macOS), so a word can sit behind your head
- captions 1–3 words at a time, each word on its own frame
- moves a camera over a real screen and marks the line that matters
- makes a clean −14 LUFS voice track and exports a 1080×1920, 30 fps MP4

The rules it follows live in one file, [`CLAUDE.md`](CLAUDE.md). Change them
and the edits change.

## Setup

You need Node 20+, `ffmpeg` on your PATH, and Claude Code. Built and tested on
macOS. The cut-out step uses Apple Vision, so it runs on macOS only. The first
`npm run transcribe` downloads the Whisper small.en model (about 590 MB) into
`models/`.

```bash
git clone https://github.com/Hrist0ff/claude-code-video-starter
cd claude-code-video-starter
npm install
npm run dev        # Remotion Studio: Video, Timing-Check, Camera-Demo
```

`Video` plays sample timing on a dark stage until you add footage.

## Use it

1. Put your clips in `public/footage/`. Claude makes 30 fps editing copies in
   `public/reel/` and works on those; your originals stay untouched.
2. Open Claude Code in this folder and say what the video is for, for example:
   `Edit public/footage/take1.mp4 into a 30-second reel for developers.`
3. Claude follows the five passes in `CLAUDE.md` and stops after each one with
   a preview: transcript and cuts, cut-out, captions, scenes, sound. Say what
   to change, or "next".

Useful commands:

```bash
npm run transcribe -- public/reel/take1.mp4 reel/take1.json
npm run cut        # reel/cut.json → public/reel/cut.mp4, voice.wav, reel/words.json
npx remotion still Video out/f120.png --frame=120 --scale=0.5
npx remotion render Video out/video.mp4 --codec=h264 --crf=16 --audio-bitrate=320k --color-space=bt709
```

## What's inside

| Path | What |
|---|---|
| `CLAUDE.md` | The editing rules and the five passes |
| `src/Reel.tsx` | Your reel: scenes as `<Sequence>`s, timed by word IDs |
| `src/components/TextKit.tsx` | Captions (`buildPages`, `KeyWordCaptions`) and type styles |
| `src/components/Cutout.tsx` | Room, Person, Stage, Shade, RiseWord, LightSweep |
| `src/components/ScreenCamera.tsx` | One camera over one screen: hold, travel, hold |
| `src/components/MarkerHighlight.tsx` | A hand-drawn marker under real text |
| `src/theme.ts` | Colours, fonts, safe area |
| `src/media.ts` | Switches from the sample to your cut after `npm run cut` |
| `scripts/transcribe.mjs` | Word timestamps with local Whisper |
| `scripts/cut-talking-head.mjs` | Cuts picture, sound and cut-outs on the same frames; writes `words.json` |
| `scripts/cutout.sh` | Person cut-out with alpha (macOS) |

## License

MIT, see [LICENSE](LICENSE). `ScreenCamera` and `MarkerHighlight` build on
ideas from [remotion-motion-graphics-skill](https://github.com/Liamrjohnston/remotion-motion-graphics-skill)
(MIT), see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Remotion has its
own license: free for individuals, for-profit companies with up to 3
employees, non-profits and evaluation; larger companies need a company license
([remotion.dev/license](https://www.remotion.dev/license)).

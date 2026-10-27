import { Audio } from "@remotion/media";
import { AbsoluteFill, Composition, Sequence, staticFile } from "remotion";
import manifest from "../reel/words.json";
import { RiseWord, Room, Shade, Stage } from "./components/Cutout";
import { KeyWordCaptions, autoPhrases, buildPages, type Word } from "./components/TextKit";
import { IS_SAMPLE, VIDEO, VOICE } from "./media";

// Your video. Claude Code edits this file. Everything is timed from
// reel/words.json (written by `npm run cut`): refer to words by ID, never by a
// fixed frame, so a recut moves every cue with it.
//
// With the sample timing it plays a short demo on the dark stage. After the
// first `npm run cut` it plays your cut with draft captions; then replace
// PHRASES and the scenes below with your own.
const { fps } = manifest;
const words: Word[] = manifest.words;
const f = (id: string) => {
  const w = words.find((w) => w.id === id);
  if (!w) throw new Error(`No word ${id} in words.json`);
  return w.startFrame;
};

// Captions: [first word, last word, key word]. 1–3 words each; one key word per
// sentence. Leave a line out where the screen already says it.
const PHRASES: [string, string, string?][] | null = null;

const DEMO: [string, string, string?][] = [
  ["demo-000", "demo-001"],
  ["demo-002", "demo-003"],
  ["demo-004", "demo-005", "demo-005"],
  ["demo-006", "demo-007"],
  ["demo-008", "demo-010"],
  ["demo-011", "demo-012", "demo-012"],
];
const pages = PHRASES
  ? buildPages(words, fps, PHRASES)
  : buildPages(words, fps, IS_SAMPLE ? DEMO : autoPhrases(words), IS_SAMPLE);

const END = manifest.durationInFrames;

// The demo: two scenes, the second starting on the word "code.".
const Demo = () => {
  const code = f("demo-005");
  return (
    <>
      <Sequence name="1 · Demo · stage" durationInFrames={code} premountFor={fps}>
        <Stage />
      </Sequence>
      <Sequence name="2 · Demo · the key word rises" from={code} durationInFrames={END - code} premountFor={fps}>
        <Stage />
        <RiseWord at={0}>code</RiseWord>
      </Sequence>
    </>
  );
};

// Your footage. One <Sequence> per scene, named, starting on a word ID, e.g.
//   <Sequence name="2 · Word behind the head" from={f("c1-012")} …>
//     <Room src={VIDEO} trimBefore={f("c1-012")} />
//     <RiseWord at={0}>word</RiseWord>
//     <Person cutout="reel/c1-cutout.webm" trimBefore={f("c1-012") - clipStart} />
//   </Sequence>
// trimBefore: Room counts frames of the whole cut; a clip's cut-out counts
// frames from that clip's own start (manifest.clips.c1.startFrame).
const Footage = ({ video }: { video: string }) => (
  <Sequence name="1 · Face" durationInFrames={END} premountFor={fps}>
    <Room src={video} trimBefore={0} />
    <Shade />
  </Sequence>
);

export const Reel = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {VIDEO ? <Footage video={VIDEO} /> : <Demo />}
    <KeyWordCaptions pages={pages} />
    {VOICE ? <Audio src={staticFile(VOICE)} /> : null}
  </AbsoluteFill>
);

export const ReelRegistration = () => (
  <Composition id="Video" component={Reel} durationInFrames={END} fps={fps} width={1080} height={1920} />
);

import { Composition } from "remotion";
import { MarkerHighlight } from "./components/MarkerHighlight";
import { ScreenCamera, type CameraKey } from "./components/ScreenCamera";
import { theme } from "./theme";

// ScreenCamera + MarkerHighlight on a page of text. In a real reel the page is
// a real screenshot (pass `src`) or a real file drawn as text; this sample page
// is only here to show the moves: hold on the top, pull back to the whole
// page, travel to one line and mark it.
const LINES = [
  "# Editing rules (sample page)",
  "",
  "1. Cut every pause longer than 0.4 s, inside the silence.",
  "2. Captions: 1-3 words, each on its own frame.",
  "3. One key word per sentence, in serif italic.",
  "4. Keep essential text inside the safe area.",
  "5. Show proof: a real screen, large enough to read.",
  "6. Never speed up the voice.",
  "7. End with one ask that echoes the hook.",
  ...Array.from({ length: 24 }, (_, i) => `   … more rules (${i + 8})`),
];
const PAGE = { width: 1200, pad: 60, size: 34, line: 54, char: 34 * 0.602 };
const pageH = PAGE.pad * 2 + LINES.length * PAGE.line;
const RULE = 7; // "6. Never speed up the voice."
const ruleY = PAGE.pad + RULE * PAGE.line;

const keys: CameraKey[] = [
  { frame: 0, x: 0, y: 0, s: 1.3, X: 72, Y: 330 },
  { frame: 40, move: 20, x: PAGE.width / 2, y: pageH / 2, s: 1100 / pageH, X: 461, Y: 835 },
  { frame: 80, move: 22, x: PAGE.pad, y: ruleY + PAGE.line / 2, s: 1.3, X: 72, Y: 835 },
];

export const CameraDemo = () => (
  <ScreenCamera keys={keys} width={PAGE.width} height={pageH}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: `${PAGE.pad}px`,
        background: theme.text,
        borderRadius: 18,
        fontFamily: theme.mono,
        fontSize: PAGE.size,
        lineHeight: `${PAGE.line}px`,
        whiteSpace: "pre",
        color: "#1d1c1a",
      }}
    >
      {LINES.map((l, i) => (
        <div key={i}>{l || " "}</div>
      ))}
    </div>
    <MarkerHighlight x={PAGE.pad - 6} y={ruleY + 6} w={LINES[RULE].length * PAGE.char + 12} h={PAGE.line - 12} frame={92} seed="demo" />
  </ScreenCamera>
);

export const CameraDemoRegistration = () => (
  <Composition id="Camera-Demo" component={CameraDemo} durationInFrames={150} fps={30} width={1080} height={1920} />
);

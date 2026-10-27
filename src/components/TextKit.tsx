import type { CSSProperties } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE, rgb, theme } from "../theme";

// 0 → 1 from `at` seconds over `seconds`, ease-out.
export const ease = (frame: number, fps: number, at: number, seconds = 0.3) =>
  interpolate(frame, [at * fps, (at + seconds) * fps], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// Key words: serif italic in an accent gradient, with a dark shadow so it reads
// on a light shirt or wall.
export const keyWordStyle: CSSProperties = {
  fontFamily: theme.serif,
  fontStyle: "italic",
  fontWeight: 400,
  backgroundImage: `linear-gradient(180deg, ${theme.text}, ${theme.accentLight} 45%, ${theme.accent})`,
  backgroundClip: "text",
  color: "transparent",
  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.55))",
};

export const sans: CSSProperties = {
  fontFamily: theme.sans,
  fontWeight: 600,
  color: theme.text,
  textShadow: "0 1px 3px rgba(0,0,0,0.5), 0 2px 14px rgba(0,0,0,0.6)",
};

export const mono: CSSProperties = {
  fontFamily: theme.mono,
  fontSize: 24,
  letterSpacing: 5,
  textTransform: "uppercase",
  color: theme.muted,
};

// A centred text box across the safe width.
export const box: CSSProperties = {
  position: "absolute",
  left: SAFE.left,
  width: SAFE.right - SAFE.left,
  textAlign: "center",
};

export type Word = { id: string; text: string; startFrame: number; endFrame: number };
export type CaptionPage = { words: { text: string; start: number; key?: boolean }[]; end: number };

// Caption pages from word IDs: [first word, last word, key word?]. Each page
// holds until the next one starts (or 0.4 s after its last word) and must stay
// on screen 0.4 s or more; a page that can't is an error, so regroup it.
export const buildPages = (
  words: Word[],
  fps: number,
  phrases: [string, string, string?][],
  strict = true,
): CaptionPage[] => {
  const at = (id: string) => {
    const i = words.findIndex((w) => w.id === id);
    if (i < 0) throw new Error(`No word ${id} in words.json`);
    return i;
  };
  return phrases.map(([first, last, key], k) => {
    const ws = words.slice(at(first), at(last) + 1);
    const start = ws[0].startFrame / fps;
    const next = phrases[k + 1] ? words[at(phrases[k + 1][0])].startFrame / fps : Infinity;
    const end = Math.min(next, Math.max(start + 0.4, ws[ws.length - 1].endFrame / fps + 0.4));
    if (strict && end - start < 0.4 - 1e-9) {
      throw new Error(`Caption "${ws.map((w) => w.text).join(" ")}" holds ${(end - start).toFixed(2)} s; regroup it`);
    }
    return { end, words: ws.map((w) => ({ text: w.text, start: w.startFrame / fps, key: w.id === key })) };
  });
};

// A first draft of the phrases: up to 3 words, a new page after . ? ! or ,
// Replace it with hand-picked phrases and key words once the cut is locked.
export const autoPhrases = (words: Word[]): [string, string][] => {
  const out: [string, string][] = [];
  let first = 0;
  words.forEach((w, i) => {
    const last = i === words.length - 1 || i - first === 2 || /[.?!,]$/.test(w.text);
    if (last) {
      out.push([words[first].id, w.id]);
      first = i + 1;
    }
  });
  return out;
};

// 1–3 words on the chest, on a dark pill sized to the whole phrase, so nothing
// jumps as words appear. Each word shows on its own frame; the key word turns
// serif italic. Back-to-back pages swap words on a steady pill. Render it
// outside any Sequence: times are composition seconds.
export const KeyWordCaptions = ({ pages, top = 1330 }: { pages: CaptionPage[]; top?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const i = pages.findIndex((p) => t >= p.words[0].start && t < p.end);
  if (i < 0) return null;
  const page = pages[i];
  const start = page.words[0].start;
  const joined = i > 0 && Math.abs(pages[i - 1].end - start) < 1e-6;
  const lead = 1 / fps; // readable on its own first frame
  const p = joined ? 1 : ease(frame, fps, start - lead, 0.12);
  return (
    <div style={{ ...box, ...sans, top, fontSize: 50, lineHeight: 1.1, translate: `0px ${(1 - p) * 10}px` }}>
      <span
        style={{
          display: "inline-block",
          height: 96,
          lineHeight: "96px",
          padding: "0 30px",
          borderRadius: 999,
          background: `rgba(${rgb(theme.background)},${0.9 * p})`,
        }}
      >
        {page.words.map((w, k) => (
          <span
            key={k}
            style={{
              ...(w.key ? { ...keyWordStyle, fontSize: "1.6em", lineHeight: 0 } : {}),
              opacity: ease(frame, fps, w.start - lead, 2 / fps),
            }}
          >
            {k ? " " : ""}
            {w.text}
          </span>
        ))}
      </span>
    </div>
  );
};

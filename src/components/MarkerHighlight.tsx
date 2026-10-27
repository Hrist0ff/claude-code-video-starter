import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { cueFrame, type Cue } from "./ScreenCamera";

// Idea from Liamrjohnston/remotion-motion-graphics-skill (MIT, see
// THIRD_PARTY_NOTICES.md). A highlighter stroke under words, drawn left to right. The edges are a
// little uneven, from a seed, so every render is the same. On white paper,
// multiply keeps black text black and tints only the paper, so the marker
// reads as behind the ink. Keep it a direct sibling of the screenshot: a
// wrapper with opacity, filter or z-index cuts the blend off.

// mulberry32, seeded from a string or number.
const rng = (seed: number | string) => {
  let a =
    typeof seed === "number"
      ? seed
      : [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761), 1779033703);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Smooth closed path through the points, via midpoints.
const smooth = (pts: [number, number][]) => {
  const mid = (i: number) => {
    const [a, b] = [pts[i], pts[(i + 1) % pts.length]];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const start = mid(pts.length - 1);
  let d = `M ${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
  pts.forEach(([x, y], i) => {
    const m = mid(i);
    d += ` Q ${x.toFixed(1)} ${y.toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  });
  return `${d} Z`;
};

export const MarkerHighlight = ({
  x,
  y,
  w,
  h,
  draw = 14,
  seed = 1,
  color = theme.accentLight,
  opacity = 0.6,
  blend = "multiply",
  ...cue
}: Cue & {
  // The ink box of the words, in the parent's pixels.
  x: number;
  y: number;
  w: number;
  h: number;
  draw?: number;
  seed?: number | string;
  color?: string;
  opacity?: number;
  blend?: "multiply" | "normal";
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = cueFrame(cue, fps);
  const p = interpolate(frame, [start, start + draw], [0, 1], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (p <= 0) return null;

  const r = rng(seed);
  const extL = h * (0.2 + 0.2 * r());
  const extR = h * (0.2 + 0.2 * r());
  const W = w + extL + extR;
  const H = h * 1.4;
  const pad = h * 0.2;
  const tilt = Math.tan(((r() - 0.5) * 0.7 * Math.PI) / 180);
  const bow = (r() - 0.5) * 0.08 * h;
  const n = Math.max(4, Math.round(w / (1.2 * h)));
  const shift = (t: number) => tilt * (t * W - W / 2) + bow * Math.sin(Math.PI * t);
  const top: [number, number][] = [];
  const bottom: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    top.push([t * W, pad + 0.05 * h + (r() - 0.5) * 0.1 * h + shift(t)]);
    bottom.push([t * W, pad + 1.05 * h + (r() - 0.5) * 0.1 * h + shift(t)]);
  }
  // A chisel tip: the left end is slanted.
  top[0][0] += 0.25 * h;
  const shape = smooth([...top, ...bottom.reverse()]);
  const slant = 0.4 * h;
  const lead = p * (W + slant);

  return (
    <svg
      width={W}
      height={H}
      style={{
        position: "absolute",
        left: x - extL,
        top: y - pad,
        overflow: "visible",
        mixBlendMode: blend,
        clipPath:
          p >= 1
            ? undefined
            : `polygon(0 0, ${lead}px 0, ${lead - slant}px ${H}px, 0 ${H}px)`,
      }}
    >
      <path d={shape} fill={color} fillOpacity={opacity} />
      <path d={shape} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={0.05 * h} />
    </svg>
  );
};

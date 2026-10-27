import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Stage } from "./Cutout";

// Idea from Liamrjohnston/remotion-motion-graphics-skill (MIT, see
// THIRD_PARTY_NOTICES.md). One camera over one real screen: hold, travel, hold. The whole screen is a
// world in image pixels; a key says which image point (x, y) sits at which
// frame point (X, Y), at scale s. Children are drawn in image pixels, so
// highlights and notes travel with the page.

// A time in the Sequence: seconds (`at`) or frames (`frame`). Default 0.
export type Cue = { at?: number; frame?: number };

export const cueFrame = (cue: Cue, fps: number) =>
  cue.frame ?? (cue.at ?? 0) * fps;

export type CameraKey = Cue & {
  x: number;
  y: number;
  s: number;
  X?: number;
  Y?: number;
  // Travel frames that end on this key's time. The camera arrives and holds.
  move?: number;
  easing?: (t: number) => number;
};

export type Camera = { x: number; y: number; s: number; X: number; Y: number };

// The middle of the safe area (x 72–850, y 230–1440).
const CENTER = { X: 461, Y: 835 };
const MOVE = 18;
const EASE = Easing.inOut(Easing.cubic);

const resolve = (k: CameraKey): Camera => ({
  x: k.x,
  y: k.y,
  s: k.s,
  X: k.X ?? CENTER.X,
  Y: k.Y ?? CENTER.Y,
});

const check = (keys: CameraKey[], fps: number) => {
  if (!keys.length) throw new Error("ScreenCamera: no keys");
  keys.forEach((k, i) => {
    if (k.s <= 0) throw new Error(`ScreenCamera: key ${i} has scale ${k.s}`);
    if (i === 0) return;
    const t = cueFrame(k, fps);
    const prev = cueFrame(keys[i - 1], fps);
    if (t - (k.move ?? MOVE) < prev) {
      throw new Error(`ScreenCamera: key ${i} starts moving before key ${i - 1} arrives`);
    }
  });
};

export const cameraAt = (frame: number, fps: number, keys: CameraKey[]): Camera => {
  let cam = resolve(keys[0]);
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const end = cueFrame(k, fps);
    const move = k.move ?? MOVE;
    if (frame >= end) {
      cam = resolve(k);
      continue;
    }
    if (frame > end - move) {
      const p = (k.easing ?? EASE)((frame - (end - move)) / move);
      const a = cam;
      const b = resolve(k);
      // Geometric, so the zoom feels even from start to end.
      const s = a.s * Math.pow(b.s / a.s, p);
      // The page offset follows the zoom's own progress, not p: then every page
      // point moves on a straight line and nothing swings sideways mid-move.
      const q = Math.abs(Math.log(b.s / a.s)) < 1e-4 ? p : (s - a.s) / (b.s - a.s);
      const mix = (u: number, v: number) => u + (v - u) * q;
      const X = mix(a.X, b.X);
      const Y = mix(a.Y, b.Y);
      const tx = mix(a.X - a.x * a.s, b.X - b.x * b.s);
      const ty = mix(a.Y - a.y * a.s, b.Y - b.y * b.s);
      cam = { X, Y, s, x: (X - tx) / s, y: (Y - ty) / s };
    }
    break;
  }
  return cam;
};

// Where image point (u, v) lands on the frame.
export const toScreen = (cam: Camera, u: number, v: number) => ({
  left: cam.X + (u - cam.x) * cam.s,
  top: cam.Y + (v - cam.y) * cam.s,
});

export const ScreenCamera = ({
  keys,
  width,
  height,
  src,
  background = <Stage />,
  overlay,
  children,
}: {
  keys: CameraKey[];
  width: number;
  height: number;
  src?: string;
  background?: ReactNode;
  overlay?: ReactNode;
  children?: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  check(keys, fps);
  const cam = cameraAt(frame, fps, keys);
  return (
    <AbsoluteFill>
      {background}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transformOrigin: "0 0",
          transform: `translate(${cam.X - cam.x * cam.s}px, ${cam.Y - cam.y * cam.s}px) scale(${cam.s})`,
        }}
      >
        {src ? (
          <Img
            src={staticFile(src)}
            style={{
              position: "absolute",
              inset: 0,
              width,
              height,
              // Divided by s, so the shadow looks the same at every scale.
              boxShadow: `0 ${30 / cam.s}px ${80 / cam.s}px rgba(0,0,0,0.6)`,
            }}
          />
        ) : null}
        {children}
      </div>
      {overlay}
    </AbsoluteFill>
  );
};

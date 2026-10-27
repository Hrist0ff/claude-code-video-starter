import { Video } from "@remotion/media";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { rgb, theme } from "../theme";
import { box, ease, keyWordStyle } from "./TextKit";

// Layers for a talking head with a cut-out (scripts/cutout.sh). Order, back to
// front: room or stage → what sits behind the person → the person → captions.
// Times are seconds from the start of the shot.

const layer: CSSProperties = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };

// The original picture (with its room), from the cut.
export const Room = ({ src, trimBefore, style }: { src: string; trimBefore: number; style?: CSSProperties }) => (
  <Video src={staticFile(src)} trimBefore={trimBefore} muted objectFit="cover" style={{ ...layer, ...style }} />
);

// The same frames, cut out, with alpha.
export const Person = ({ cutout, trimBefore = 0, style }: { cutout: string; trimBefore?: number; style?: CSSProperties }) => (
  <OffthreadVideo src={staticFile(cutout)} trimBefore={trimBefore} transparent muted style={{ ...layer, ...style }} />
);

// A dark stage with a soft accent glow, instead of the room.
export const Stage = () => (
  <AbsoluteFill
    style={{
      backgroundColor: theme.background,
      backgroundImage: `radial-gradient(circle at 50% 30%, ${theme.accent}38, transparent 60%)`,
    }}
  />
);

// Darkens the head room so words read over a bright room.
export const Shade = ({ at = -1 }: { at?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        opacity: at < 0 ? 1 : ease(frame, fps, at),
        background: `linear-gradient(180deg, rgba(${rgb(theme.background)},0.85) 0%, rgba(${rgb(theme.background)},0.5) 30%, transparent 52%)`,
      }}
    />
  );
};

// A big key word that rises from behind the head. Draw it before the Person,
// so the head covers its lower edge; it is hidden below `mask` until it rises.
export const RiseWord = ({
  children,
  at,
  size = 210,
  top = 340,
  mask = 600,
}: {
  children: ReactNode;
  at: number;
  size?: number;
  top?: number;
  mask?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = ease(frame, fps, at, 0.35);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: mask, overflow: "hidden" }}>
      <div style={{ ...box, ...keyWordStyle, top, fontSize: size, lineHeight: 1, translate: `0px ${(1 - up) * (mask - top + 20)}px` }}>
        {children}
      </div>
    </div>
  );
};

// A band of warm light that passes behind the person, starting at `at`.
export const LightSweep = ({ at, duration = 0.7, strength = 0.6 }: { at: number; duration?: number; strength?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const x = interpolate(frame, [at * fps, (at + duration) * fps], [-300, 1840], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(105deg, transparent ${x - 260}px, rgba(${rgb(theme.accentLight)},${strength}) ${x}px, transparent ${x + 260}px)` }}
    />
  );
};

import { Video } from "@remotion/media";
import { AbsoluteFill, Composition, staticFile, useCurrentFrame } from "remotion";
import manifest from "../reel/words.json";
import { Stage } from "./components/Cutout";
import { VIDEO } from "./media";

// Pass 01 check: the cut with each word on its frames, so you can hear whether
// it lines up (the cut plays with its sound). Scrub frame by frame and note
// "f215 is late".

export const TimingCheck = () => {
  const frame = useCurrentFrame();
  const word = manifest.words.find((w) => frame >= w.startFrame && frame < w.endFrame);
  return (
    <AbsoluteFill>
      {VIDEO ? <Video src={staticFile(VIDEO)} /> : <Stage />}
      <div style={{ position: "absolute", left: 40, top: 40, padding: "8px 16px", background: "rgba(0,0,0,0.6)", color: "white", fontFamily: "Menlo, monospace", fontSize: 40 }}>
        f{frame} {word ? `· ${word.id}` : ""}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1300,
          textAlign: "center",
          color: "white",
          fontFamily: "Arial, sans-serif",
          fontSize: 120,
          fontWeight: 700,
          WebkitTextStroke: "8px black",
          paintOrder: "stroke fill",
        }}
      >
        {word?.text}
      </div>
    </AbsoluteFill>
  );
};

export const TimingCheckRegistration = () => (
  <Composition id="Timing-Check" component={TimingCheck} durationInFrames={manifest.durationInFrames} fps={manifest.fps} width={1080} height={1920} />
);

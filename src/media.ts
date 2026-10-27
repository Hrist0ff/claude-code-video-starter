import manifest from "../reel/words.json";

// `npm run cut` writes the cut and the voice to public/reel/ and replaces
// reel/words.json. Until then reel/words.json is a sample and there is no footage.
export const IS_SAMPLE = "sample" in manifest;
export const VIDEO = IS_SAMPLE ? null : "reel/cut.mp4";
export const VOICE = IS_SAMPLE ? null : "reel/voice.wav";

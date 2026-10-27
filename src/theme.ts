// One place for the look. Change these and every scene follows.
export const theme = {
  background: "#0b0d12",
  text: "#f4f5f7",
  muted: "#8b90a0",
  accent: "#3d7bff",
  accentLight: "#9cc0ff",
  // Key words: a serif italic in an accent gradient. These fonts exist on most
  // systems; swap in your own (and load them) for a stronger look.
  serif: "Georgia, 'Times New Roman', serif",
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  mono: "ui-monospace, Menlo, Consolas, monospace",
};

// "#3d7bff" → "61,123,255", for rgba().
export const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");

// 1080×1920. Essential words and proof stay inside this box: the app's own
// buttons and captions cover the edges, and the right side most.
export const SAFE = { left: 72, right: 850, top: 230, bottom: 1440 };

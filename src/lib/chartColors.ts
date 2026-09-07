// Kategoriale Chart-Palette, validiert mit dem dataviz-Skill-Validator
// (scripts/validate_palette.js) gegen den Cream-Hintergrund (#FAF6EA).
// Slot 2 ist auf unser Marken-Orange gesetzt, der Rest ist das
// dokumentierte Default-Set (siehe references/palette.md) — alle
// Checks (Lightness/Chroma/CVD/Kontrast) bestehen in dieser Reihenfolge.
// NICHT einzelne Hex-Werte ändern, ohne den Validator erneut laufen zu
// lassen — die Reihenfolge selbst ist der CVD-Sicherheitsmechanismus.
export const CHART_SERIES = [
  "#2a78d6", // 1 blau
  "#e94e1b", // 2 orange (Markenfarbe)
  "#1baf7a", // 3 aqua
  "#eda100", // 4 gelb
  "#e87ba4", // 5 magenta
  "#008300", // 6 grün
  "#4a3aa7", // 7 violett
  "#e34948", // 8 rot
] as const;

export const CHART_GRID = "rgba(27,27,20,0.08)";
export const CHART_AXIS_TEXT = "rgba(27,27,20,0.45)";
export const CHART_TOOLTIP_BG = "#1b1b14";
export const CHART_TOOLTIP_TEXT = "#faf6ea";

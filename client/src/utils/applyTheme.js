// Generate a full Tailwind-style palette (50–900) from a single base colour and
// apply it to the document via the CSS variables defined in index.css. This is
// how the admin Theme page recolours the whole app at runtime.

function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "").trim();
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (n.length !== 6) return null;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const mix = ([r, g, b], [tr, tg, tb], p) => [
  Math.round(r + (tr - r) * p),
  Math.round(g + (tg - g) * p),
  Math.round(b + (tb - b) * p),
];
const channels = (rgb) => rgb.join(" ");

// Treats the given colour as the "600" shade and derives lighter/darker shades.
export function paletteFromBase(hex) {
  const base = hexToRgb(hex);
  if (!base) return null;
  return {
    50: channels(mix(base, WHITE, 0.92)),
    100: channels(mix(base, WHITE, 0.84)),
    200: channels(mix(base, WHITE, 0.68)),
    300: channels(mix(base, WHITE, 0.5)),
    400: channels(mix(base, WHITE, 0.28)),
    500: channels(mix(base, WHITE, 0.12)),
    600: channels(base),
    700: channels(mix(base, BLACK, 0.18)),
    800: channels(mix(base, BLACK, 0.34)),
    900: channels(mix(base, BLACK, 0.48)),
  };
}

export function applyTheme(theme) {
  if (!theme || typeof document === "undefined") return;
  const root = document.documentElement;

  const primary = theme.primaryColor && paletteFromBase(theme.primaryColor);
  if (primary) {
    for (const [k, v] of Object.entries(primary)) root.style.setProperty(`--color-primary-${k}`, v);
  }

  const accent = theme.accentColor && paletteFromBase(theme.accentColor);
  if (accent) {
    for (const k of [50, 100, 400, 500, 600, 700]) {
      root.style.setProperty(`--color-accent-${k}`, accent[k] || accent[600]);
    }
  }

  if (theme.fontFamily) {
    root.style.setProperty("--app-font", `"${theme.fontFamily}"`);
    loadWebFont(theme.fontFamily);
  }
}

// Fonts that aren't bundled/system and need loading from Google Fonts.
export const FONT_OPTIONS = ["Inter", "System UI", "Roboto", "Poppins", "Lato", "Montserrat", "Open Sans", "Georgia"];
const SYSTEM_FONTS = new Set(["Inter", "System UI", "Georgia"]);

function loadWebFont(family) {
  if (SYSTEM_FONTS.has(family) || typeof document === "undefined") return;
  const id = `gfont-${family.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

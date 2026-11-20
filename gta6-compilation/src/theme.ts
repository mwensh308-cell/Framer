import { loadFont as loadLalezar } from "@remotion/google-fonts/Lalezar";
import { loadFont as loadCairo } from "@remotion/google-fonts/Cairo";

const lalezar = loadLalezar("normal", { subsets: ["arabic", "latin"] });
const cairo = loadCairo("normal", {
  weights: ["400", "700", "900"],
  subsets: ["arabic", "latin"],
});

// ألوان مأخوذة من شعار القناة
export const colors = {
  pink: "#ff2d95",
  magenta: "#d61aff",
  purple: "#7b2ff7",
  orange: "#ffb347",
  night: "#12051f",
  deep: "#24093d",
  white: "#fff7fb",
};

export const gradient = `linear-gradient(135deg, ${colors.orange} 0%, ${colors.pink} 45%, ${colors.purple} 100%)`;

export const fonts = {
  display: lalezar.fontFamily,
  body: cairo.fontFamily,
};

export const neonText = (color: string = colors.pink) =>
  `0 0 6px ${color}, 0 0 18px ${color}, 0 0 42px ${color}`;

export const FPS = 30;
export const sec = (s: number) => Math.round(s * FPS);

// Fontes do app e dos textos sobre as mídias (o canvas usa o nome real da família).
import { Anton, Caveat, Inter, Playfair_Display } from "next/font/google";
import type { FontId } from "./types";

export const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"] });
const anton = Anton({ subsets: ["latin"], weight: "400" });
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "700"] });

export const FONT_FAMILY: Record<FontId, string> = {
  sans: inter.style.fontFamily,
  serif: playfair.style.fontFamily,
  display: anton.style.fontFamily,
  hand: caveat.style.fontFamily,
};

export const FONT_LABEL: Record<FontId, string> = { sans: "Moderna", serif: "Elegante", display: "Impacto", hand: "Manuscrita" };

/** Garante que as fontes carregaram antes de desenhar no canvas. */
export async function loadFonts() {
  await Promise.all(Object.values(FONT_FAMILY).flatMap((f) => [document.fonts.load(`400 40px ${f}`), document.fonts.load(`700 40px ${f}`)])).catch(() => {});
}

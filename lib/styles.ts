// Estilos prontos: arquétipos de criadores famosos (descrevem o jeito de postar, sem usar a imagem de ninguém).
import type { Style } from "./types";

const adj = (brightness = 1, contrast = 1, saturation = 1, warmth = 0, vignette = 0) => ({ brightness, contrast, saturation, warmth, vignette });

export const BUILTIN_STYLES: Style[] = [
  {
    id: "creator_energetico", name: "Creator energético", aspect: "9:16", speed: 1.1, subtitles: true, hashtagCount: 5,
    description: "Estilo dos grandes youtubers/tiktokers: gancho gritado nos primeiros segundos, cortes a cada 1–2 s, legendas grandes palavra a palavra, cores vivas, expressão exagerada.",
    adjust: adj(1.05, 1.12, 1.25, 0.1), text: { font: "display", color: "#ffe600", bg: "outline", bgColor: "#000000", bold: true, upper: true },
    captionTone: "animado, frases curtas, emojis moderados, termina com pergunta",
  },
  {
    id: "luxo_minimalista", name: "Minimalista de luxo", aspect: "4:5", speed: 1, subtitles: false, hashtagCount: 3,
    description: "Estilo de marcas de luxo e influenciadoras de moda: muito espaço vazio, poucas palavras, ritmo lento, tons neutros, contraste suave, elegância.",
    adjust: adj(1.02, 1.05, 0.85, 0.05, 0.25), text: { font: "serif", color: "#ffffff", bg: "shadow", bgColor: "#000000", bold: false, upper: false },
    captionTone: "sofisticado, poucas palavras, sem gírias, no máximo 1 emoji",
  },
  {
    id: "vendedor_direto", name: "Vendedor direto", aspect: "9:16", speed: 1.05, subtitles: true, hashtagCount: 5,
    description: "Estilo dos grandes vendedores de redes sociais: oferta clara, preço na tela, urgência, demonstração rápida do produto e CTA repetido.",
    adjust: adj(1.05, 1.1, 1.15), text: { font: "display", color: "#ffffff", bg: "box", bgColor: "#e11d48", bold: true, upper: true },
    captionTone: "direto, persuasivo, benefícios em lista com emojis, CTA forte",
  },
  {
    id: "bastidores_autentico", name: "Bastidores autêntico", aspect: "9:16", speed: 1, subtitles: true, hashtagCount: 4,
    description: "Estilo 'vlog do dia a dia' de criadores autênticos: câmera na mão, luz natural, fala com a câmera, sem produção, legenda simples embaixo.",
    adjust: adj(1.03, 1, 1.05, 0.15), text: { font: "sans", color: "#111111", bg: "box", bgColor: "#ffffff", bold: true, upper: false },
    captionTone: "conversa, primeira pessoa, sincero, conta uma história curta",
  },
  {
    id: "fitness_motivacional", name: "Fitness motivacional", aspect: "9:16", speed: 1.1, subtitles: true, hashtagCount: 6,
    description: "Estilo de atletas e influenciadores fitness: contraste alto, tons frios, frases de impacto, antes/depois, música intensa.",
    adjust: adj(1, 1.25, 1.05, -0.25, 0.3), text: { font: "display", color: "#ffffff", bg: "shadow", bgColor: "#000000", bold: true, upper: true },
    captionTone: "motivacional, imperativo, frases de impacto",
  },
  {
    id: "gastronomia", name: "Gastronomia apetitosa", aspect: "4:5", speed: 1, subtitles: false, hashtagCount: 6,
    description: "Estilo de chefs e perfis de comida: close no prato, cores quentes e saturadas, vapor, textura, mãos preparando.",
    adjust: adj(1.05, 1.1, 1.3, 0.3), text: { font: "serif", color: "#ffffff", bg: "shadow", bgColor: "#000000", bold: true, upper: false },
    captionTone: "sensorial, descreve sabor e textura, convida a provar",
  },
  {
    id: "professor", name: "Educativo / professor", aspect: "4:5", speed: 1, subtitles: true, hashtagCount: 5,
    description: "Estilo de divulgadores e especialistas: título forte no topo, passos numerados, visual limpo, carrossel didático.",
    adjust: adj(1.03, 1.05, 1), text: { font: "sans", color: "#ffffff", bg: "box", bgColor: "#2563eb", bold: true, upper: false },
    captionTone: "didático, lista numerada, linguagem simples, pede para salvar",
  },
  {
    id: "lifestyle_pastel", name: "Lifestyle pastel", aspect: "4:5", speed: 1, subtitles: false, hashtagCount: 5,
    description: "Estilo de influenciadoras de lifestyle: imagem clara e lavada, tons pastel, contraste baixo, delicado.",
    adjust: adj(1.1, 0.9, 0.8, 0.1), text: { font: "hand", color: "#ffffff", bg: "shadow", bgColor: "#000000", bold: true, upper: false },
    captionTone: "leve, afetuoso, emojis delicados",
  },
  {
    id: "cinematico", name: "Cinemático", aspect: "9:16", speed: 1, subtitles: false, hashtagCount: 4,
    description: "Estilo de videomakers e viajantes: tons de filme (sombras frias, pele quente), vinheta, movimentos lentos, texto pequeno e espaçado.",
    adjust: adj(0.97, 1.15, 0.9, 0.1, 0.45), text: { font: "serif", color: "#f5f5f4", bg: "none", bgColor: "#000000", bold: false, upper: true },
    captionTone: "poético, curto, evocativo",
  },
  {
    id: "noticia", name: "Notícia / fato rápido", aspect: "4:5", speed: 1, subtitles: true, hashtagCount: 4,
    description: "Estilo de perfis de notícias e curiosidades: manchete em caixa no topo, fato direto, fonte citada, sem enrolação.",
    adjust: adj(1, 1.05, 1), text: { font: "sans", color: "#ffffff", bg: "box", bgColor: "#111111", bold: true, upper: false },
    captionTone: "informativo, objetivo, cita a fonte, termina perguntando a opinião",
  },
];

// Modelos de dados do app. Tudo fica no aparelho (IndexedDB) até a fase do CRM.

export type Aspect = "original" | "1:1" | "4:5" | "9:16" | "16:9";
export type FontId = "sans" | "serif" | "display" | "hand";
export type TextBg = "none" | "shadow" | "outline" | "box";

export type TextLayer = {
  id: string;
  text: string;
  x: number; // centro, 0–1 da largura
  y: number; // centro, 0–1 da altura
  size: number; // altura da letra em fração da largura (0.03–0.15)
  color: string;
  bg: TextBg;
  bgColor: string;
  font: FontId;
  bold: boolean;
  upper: boolean;
  start?: number | null; // segundos no vídeo final; vazio = o tempo todo
  end?: number | null;
};

export type Adjust = {
  brightness: number; // 1 = original
  contrast: number; // 1 = original
  saturation: number; // 1 = original
  warmth: number; // -1 frio … 1 quente
  vignette: number; // 0–1
};

export type Segment = { start: number; end: number; text: string }; // tempo do arquivo original

export type SubtitleStyle = { font: FontId; color: string; bg: TextBg; bgColor: string; y: number; size: number; upper: boolean };

export type EditSpec = {
  aspect: Aspect;
  zoom: number; // 1–3
  focusX: number; // 0–1, onde fica o centro do recorte
  focusY: number;
  adjust: Adjust;
  texts: TextLayer[];
  // só vídeo
  trim: { start: number; end: number | null };
  speed: number; // 0.5–2
  mute: boolean;
  subtitles: { enabled: boolean; segments: Segment[]; style: SubtitleStyle };
};

export type Media = {
  id: string;
  kind: "image" | "video";
  blob: Blob;
  thumb: string; // dataURL pequena
  w: number;
  h: number;
  duration: number; // 0 para foto
  created: number;
  name: string;
  parentId?: string; // versão editada de outra mídia
  spec?: EditSpec; // última edição feita a partir desta mídia
};

export type Network = "instagram" | "tiktok";
export type PostFormat = "feed" | "carrossel" | "reels" | "story" | "tiktok";
export type PostStatus = "rascunho" | "agendado" | "publicado";

export type Post = {
  id: string;
  mediaIds: string[];
  network: Network;
  format: PostFormat;
  objective: ObjectiveId;
  caption: string;
  hashtags: string[];
  scheduledAt: number | null;
  status: PostStatus;
  created: number;
};

export type ObjectiveId = "venda" | "marca_pessoal" | "servico_local" | "evento" | "engajamento" | "educativo" | "bastidores" | "depoimento";

export type Style = {
  id: string;
  name: string;
  description: string; // como são os posts nesse estilo (usado pela IA)
  inspiration?: string; // "inspirado em …" (opcional, só descrição de estilo)
  adjust: Adjust;
  text: Pick<TextLayer, "font" | "color" | "bg" | "bgColor" | "bold" | "upper">;
  aspect: Aspect;
  speed: number;
  subtitles: boolean;
  captionTone: string;
  hashtagCount: number;
  custom?: boolean;
};

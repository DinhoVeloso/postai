// Dicas de horário por objetivo e rede (horário de Brasília). São pontos de partida a partir de
// padrões gerais de uso das redes no Brasil — o melhor horário real é o do SEU público: teste e compare.
import type { Network, ObjectiveId } from "./types";

type Slot = { days: number[]; from: number; to: number }; // dias 0=dom … 6=sáb, horas inteiras
type Tip = { slots: Slot[]; why: string; frequency: string };

const WEEK = [1, 2, 3, 4, 5], ALL = [0, 1, 2, 3, 4, 5, 6], WEEKEND = [0, 6];

const TIPS: Record<ObjectiveId, Record<Network, Tip>> = {
  venda: {
    instagram: { slots: [{ days: WEEK, from: 19, to: 22 }, { days: [0], from: 18, to: 21 }, { days: WEEK, from: 12, to: 13 }], why: "À noite as pessoas têm tempo e disposição para comprar; domingo à noite é forte para quem planeja a semana; almoço pega a pausa do trabalho.", frequency: "3–5 posts de venda por semana, intercalados com conteúdo que não vende." },
    tiktok: { slots: [{ days: ALL, from: 19, to: 23 }, { days: WEEK, from: 12, to: 14 }], why: "Pico de uso do TikTok é à noite; o algoritmo distribui ao longo de horas, então publicar no começo do pico ajuda.", frequency: "1 vídeo por dia se possível." },
  },
  marca_pessoal: {
    instagram: { slots: [{ days: WEEK, from: 7, to: 9 }, { days: WEEK, from: 18, to: 21 }, { days: WEEKEND, from: 10, to: 12 }], why: "Começo do dia e fim do expediente são momentos de rolar o feed com calma; fim de semana de manhã também.", frequency: "4–7 posts por semana + stories diários." },
    tiktok: { slots: [{ days: ALL, from: 18, to: 22 }, { days: WEEKEND, from: 11, to: 14 }], why: "Noites e fins de semana concentram o maior tempo de tela.", frequency: "1–2 vídeos por dia nas primeiras semanas para o algoritmo te conhecer." },
  },
  servico_local: {
    instagram: { slots: [{ days: [1, 2, 3, 4], from: 8, to: 10 }, { days: WEEK, from: 12, to: 13 }, { days: WEEK, from: 18, to: 20 }], why: "Quem procura serviço decide em horário comercial; publique antes das pessoas agendarem o dia ou na pausa do almoço.", frequency: "3–4 posts por semana; stories com agenda disponível." },
    tiktok: { slots: [{ days: WEEK, from: 12, to: 14 }, { days: WEEK, from: 18, to: 21 }], why: "Almoço e começo da noite alcançam o público da cidade.", frequency: "3–5 vídeos por semana." },
  },
  evento: {
    instagram: { slots: [{ days: WEEK, from: 11, to: 13 }, { days: WEEK, from: 18, to: 20 }], why: "Anúncio com 2–4 semanas de antecedência, lembretes 7, 3 e 1 dia antes, e post 'é hoje' de manhã.", frequency: "Aumente a frequência na última semana." },
    tiktok: { slots: [{ days: ALL, from: 18, to: 22 }], why: "Noite tem mais alcance; poste bastidores da preparação para gerar expectativa.", frequency: "Diário na semana do evento." },
  },
  engajamento: {
    instagram: { slots: [{ days: ALL, from: 20, to: 22 }, { days: WEEK, from: 12, to: 13 }], why: "Posts de conversa precisam de você disponível para responder logo depois de publicar; a noite tem mais gente comentando.", frequency: "2–3 por semana; responda nos primeiros 30–60 min." },
    tiktok: { slots: [{ days: ALL, from: 20, to: 23 }], why: "Maior volume de usuários ativos e comentando.", frequency: "Diário." },
  },
  educativo: {
    instagram: { slots: [{ days: [1, 2, 3], from: 7, to: 9 }, { days: WEEK, from: 12, to: 13 }, { days: [0], from: 19, to: 21 }], why: "Conteúdo para salvar funciona no começo da semana e do dia, quando as pessoas estão no modo 'aprender'.", frequency: "2–4 por semana (carrosséis)." },
    tiktok: { slots: [{ days: WEEK, from: 18, to: 21 }, { days: WEEKEND, from: 10, to: 13 }], why: "Fim da tarde e fins de semana de manhã têm atenção para conteúdo mais longo.", frequency: "3–5 por semana." },
  },
  bastidores: {
    instagram: { slots: [{ days: ALL, from: 10, to: 12 }, { days: ALL, from: 17, to: 19 }], why: "Bastidores combinam com o horário em que a ação acontece; stories em tempo real funcionam muito bem.", frequency: "Stories diários; 1–2 reels por semana." },
    tiktok: { slots: [{ days: ALL, from: 17, to: 21 }], why: "Fim de tarde e noite.", frequency: "3–5 por semana." },
  },
  depoimento: {
    instagram: { slots: [{ days: [2, 3, 4], from: 18, to: 21 }, { days: [0], from: 18, to: 21 }], why: "Prova social perto dos posts de venda e quando o público está decidindo compras.", frequency: "1–2 por semana, antes de campanhas." },
    tiktok: { slots: [{ days: ALL, from: 19, to: 22 }], why: "Noite, junto do pico de uso.", frequency: "1–2 por semana." },
  },
};

export const DAY = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function tipFor(o: ObjectiveId, n: Network) { return TIPS[o][n]; }

export function describeSlot(s: Slot) {
  const days = s.days.length === 7 ? "todos os dias" : s.days.join() === WEEK.join() ? "seg a sex" : s.days.join() === WEEKEND.join() ? "sáb e dom" : s.days.map((d) => DAY[d]).join(", ");
  return `${days}, ${s.from}h–${s.to}h`;
}

/** Próximos horários sugeridos (início de cada janela), a partir de agora. */
export function nextSlots(o: ObjectiveId, n: Network, count = 4, from = new Date()): Date[] {
  const out: Date[] = [];
  const tip = TIPS[o][n];
  for (let d = 0; d < 14 && out.length < count * 3; d++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
    for (const s of tip.slots) {
      if (!s.days.includes(day.getDay())) continue;
      // começa 15 min depois do início da janela, como faria uma pessoa que agenda
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), s.from, 15);
      if (t.getTime() > from.getTime() + 10 * 60_000) out.push(t);
    }
  }
  return out.sort((a, b) => +a - +b).slice(0, count);
}

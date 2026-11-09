// "Skills" de marketing: o que a IA sabe sobre cada objetivo de post.
import type { ObjectiveId } from "./types";

export type Objective = { id: ObjectiveId; label: string; emoji: string; playbook: string };

export const OBJECTIVES: Objective[] = [
  {
    id: "venda", label: "Venda de produto", emoji: "🛍️",
    playbook: `Estrutura AIDA (atenção → interesse → desejo → ação) ou PAS (problema → agitação → solução).
Gancho nos 2 primeiros segundos mostrando o produto em uso ou o resultado, nunca logo/abertura lenta.
Benefício antes de característica ("seca em 5 min" > "tecido dry-fit"). Mostre preço ou condição se for vantagem.
Prova social (avaliação, quantos já compraram) e escassez real (estoque, prazo) quando existirem — nunca invente.
CTA único e claro: "link na bio", "chama no direct", "comenta EU QUERO". Texto na tela curto: oferta + CTA.`,
  },
  {
    id: "marca_pessoal", label: "Divulgação pessoal / marca pessoal", emoji: "🙋",
    playbook: `Mostre a pessoa: rosto nos primeiros segundos, opinião própria, história curta com virada.
Ganchos: "ninguém te conta que…", "o erro que eu cometi…", "3 coisas que aprendi…".
Consistência de visual e tom vale mais que perfeição. Legenda em primeira pessoa, conversa, termina com pergunta.
CTA de relacionamento: seguir, salvar, comentar experiência. Poucas hashtags, de nicho.`,
  },
  {
    id: "servico_local", label: "Serviço / negócio local", emoji: "📍",
    playbook: `Antes e depois, processo acelerado, cliente satisfeito. Cite bairro/cidade no texto e na legenda.
Gancho visual do resultado. Explique em 1 frase o problema que resolve.
CTA: agendar pelo direct/WhatsApp, horário de atendimento, endereço. Hashtags locais (#bairro #cidade + serviço).`,
  },
  {
    id: "evento", label: "Evento / lançamento", emoji: "📅",
    playbook: `Data, hora e local na tela em texto grande e legível. Contagem regressiva ("faltam 3 dias").
Mostre o clima (edições anteriores, bastidores da preparação). Urgência real: vagas, lote, preço sobe.
Sequência: anúncio → lembretes → "é hoje" → cobertura. CTA: garantir ingresso/inscrição, marcar um amigo.`,
  },
  {
    id: "engajamento", label: "Engajamento / comunidade", emoji: "💬",
    playbook: `Perguntas, enquetes, "isso ou aquilo", polêmica leve do nicho, memes do nicho, desafios.
Gancho que gera identificação ("se você também…"). Final aberto que puxa comentário.
CTA: "comenta", "marca alguém", "salva para depois". Responder comentários faz parte da estratégia.`,
  },
  {
    id: "educativo", label: "Educativo / autoridade", emoji: "🎓",
    playbook: `Promessa clara no gancho ("como X em 30 segundos"), lista numerada, um passo por cena/slide.
Texto na tela com o título de cada passo. Carrossel funciona muito bem (capa forte + 5–8 slides + slide de CTA).
Termine com resumo e CTA de salvar/compartilhar. Linguagem simples, sem jargão.`,
  },
  {
    id: "bastidores", label: "Bastidores", emoji: "🎬",
    playbook: `Autenticidade > produção. Mostre processo, rotina, erros, equipe. Legendas na tela ajudam quem assiste sem som.
Gancho de curiosidade ("como é feito…", "um dia aqui"). Humaniza a marca e prepara para vendas futuras.
CTA leve: seguir para ver mais, perguntar nos comentários.`,
  },
  {
    id: "depoimento", label: "Depoimento / prova social", emoji: "⭐",
    playbook: `Cliente real falando do resultado (com autorização). Primeiro a transformação, depois o contexto.
Destaque a frase mais forte em texto grande. Nome/cidade do cliente dão credibilidade.
CTA: "quer o mesmo resultado? chama no direct". Nunca invente depoimento.`,
  },
];

export const objective = (id: ObjectiveId) => OBJECTIVES.find((o) => o.id === id) ?? OBJECTIVES[0];

export const PLATFORM_RULES = `Instagram: feed 4:5 (1080×1350) ou 1:1; reels e stories 9:16 (1080×1920) — deixe a área de baixo (~20%) e o topo (~12%) livres de texto por causa da interface. Legenda pode ser longa, mas a 1ª linha decide (aparece cortada). 3–8 hashtags relevantes.
TikTok: 9:16, gancho em até 2 s, ritmo rápido, legendas na tela, texto fora das bordas e da parte de baixo. Legenda curta, 3–5 hashtags.
Vídeo curto: 7–30 s para alcance; até 60–90 s para conteúdo educativo. Muita gente assiste sem som: use legendas.`;

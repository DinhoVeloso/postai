# Postai

App de social media (PWA, funciona como app no celular): fotografar, editar com IA, planejar e publicar posts do Instagram e do TikTok.

## O que tem no piloto
- **Câmera** no app (foto e vídeo) e importação da galeria.
- **Editor** de foto e vídeo: formato (1:1, 4:5, 9:16…), zoom/enquadramento, cor, temperatura, vinheta, textos arrastáveis, corte, velocidade, som.
- **Edição por prompt** com "skills" de marketing por objetivo (venda, marca pessoal, serviço local, evento, engajamento, educativo, bastidores, depoimento) — a IA devolve a edição, legenda, hashtags e ganchos.
- **Legendas automáticas** das falas (Groq Whisper).
- **Estilos** prontos e estilos próprios "inspirados em" criadores/marcas (só o jeito de editar e escrever).
- **Agenda** com dicas de horário por objetivo e rede, lembrete no calendário do celular (.ics) e publicação pelo compartilhar do celular.

Tudo fica no aparelho (IndexedDB). Login, CRM de clientes e publicação automática nas redes ficam para as próximas fases.

## Peças
- Next.js 16 + Tailwind 4, hospedado na Vercel.
- Vídeo: ffmpeg.wasm no navegador. `public/ffmpeg/` é cópia de `node_modules/@ffmpeg/ffmpeg/dist/esm` (o Turbopack não empacota o Worker dele); o núcleo vem do unpkg (`@ffmpeg/core@0.12.9`). Ao atualizar o pacote, copie de novo.
- IA gratuita com troca automática: Groq → Gemini → OpenRouter (`lib/ai/providers.ts`).

## Rodar
```
npm install
# .env.local: GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY
npm run dev
```
A câmera do app só abre em https (ou localhost); no celular pela rede local use o botão de galeria/câmera do sistema.

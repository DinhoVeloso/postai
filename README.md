# Postee

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

## Conectar Instagram e TikTok
Na primeira abertura, o app mostra uma tela de boas-vindas. Nela dá para conectar as redes ou pular. Depois, as contas ficam em **Estilos → Contas conectadas**. As chaves de acesso ficam num cookie criptografado (`POSTAI_SECRET`), separado em cada aparelho.

**Instagram** ([developers.facebook.com](https://developers.facebook.com/apps)):
1. Crie um app do tipo **Empresa** e adicione o produto **Instagram → API com login do Instagram**.
2. Em *Configurar login da empresa*, cadastre a URL de redirecionamento `https://postai-alpha.vercel.app/api/social/instagram/callback`.
3. Política de privacidade: `https://postai-alpha.vercel.app/privacidade`. Exclusão de dados: `https://postai-alpha.vercel.app/privacidade#exclusao`.
4. Em *Funções do app → Testadores do Instagram*, adicione sua conta e aceite o convite no Instagram (Configurações → Apps e sites).
5. Copie o **ID do app do Instagram** e a **chave secreta** para a Vercel: `INSTAGRAM_APP_ID` e `INSTAGRAM_APP_SECRET`.

Em modo de desenvolvimento, só as contas cadastradas como testadoras conseguem conectar. Isso basta para o seu uso e para alguns clientes. Para abrir a qualquer pessoa, o app precisa passar pela revisão da Meta.

**TikTok** ([developers.tiktok.com](https://developers.tiktok.com/apps)):
1. Crie um app e adicione os produtos **Login Kit** e **Content Posting API**, com os escopos `user.info.basic`, `video.upload` e `video.publish`.
2. Cadastre o redirect URI `https://postai-alpha.vercel.app/api/social/tiktok/callback`. Termos: `https://postai-alpha.vercel.app/privacidade#termos`. Privacidade: `https://postai-alpha.vercel.app/privacidade`.
3. Use o **Sandbox** e adicione sua conta como usuária de teste.
4. Copie o **Client key** e o **Client secret** para a Vercel: `TIKTOK_CLIENT_KEY` e `TIKTOK_CLIENT_SECRET`.

Até passar pela auditoria do TikTok, os posts feitos pela API saem como privados.

Depois de cadastrar as variáveis, faça um novo deploy.

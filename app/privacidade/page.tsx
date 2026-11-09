import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidade e termos · Postai" };

export default function Privacidade() {
  return (
    <main className="mx-auto h-full max-w-2xl space-y-4 overflow-y-auto p-6 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold">Política de privacidade</h1>
      <p>O Postai é uma ferramenta para criar, editar e programar posts. Fotos, vídeos, legendas e a agenda ficam guardados no próprio aparelho de quem usa, e não em servidores do Postai.</p>
      <h2 className="font-semibold">Contas do Instagram e do TikTok</h2>
      <p>Quando você conecta uma rede, o Postai recebe uma chave de acesso, e não a sua senha. Essa chave fica criptografada num cookie do seu navegador e só é usada para mostrar o nome e a foto da conta e para publicar os posts que você pedir. Nada é vendido nem compartilhado com terceiros.</p>
      <h2 className="font-semibold">Inteligência artificial</h2>
      <p>Quando você pede uma edição, uma legenda ou uma transcrição, o texto do pedido e, no caso de transcrição, o áudio do vídeo são enviados ao serviço de IA só para gerar a resposta.</p>
      <h2 id="exclusao" className="font-semibold">Como apagar seus dados</h2>
      <p>Toque em desconectar em Estilos → Contas conectadas para apagar a chave de acesso. Para apagar as mídias e os posts, use “Apagar” no app ou limpe os dados do site no navegador. Também é possível remover o Postai nas configurações de apps conectados do Instagram ou do TikTok.</p>

      <h1 id="termos" className="pt-4 text-2xl font-bold">Termos de uso</h1>
      <p>Você é responsável pelo conteúdo que cria e publica e precisa ter os direitos sobre as fotos, vídeos e músicas que usa. O conteúdo também deve seguir as regras do Instagram e do TikTok. O Postai é oferecido como está, em versão piloto, sem garantia de funcionamento contínuo.</p>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { INSTAGRAM_URL } from '../../components/legal-page';

export const metadata: Metadata = { title: 'Exclusão de Dados · Você é 13 ou 22?', description: 'Como pedir a exclusão dos seus dados do jogo Você é 13 ou 22?.' };

export default function DataDeletionPage() {
  return <LegalPage title="Exclusão de dados" current="/exclusao-de-dados">
    <p>Você pode pedir a exclusão de tudo o que o jogo <strong>Você é 13 ou 22?</strong> guarda sobre a sua participação, a qualquer momento e sem custo.</p>

    <h2>Como pedir</h2>
    <ol>
      <li>Abra o perfil <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@vocee13ou22</a> no Instagram.</li>
      <li>Envie uma mensagem direta escrita <strong>APAGAR MEUS DADOS</strong>, usando a mesma conta que comentou no jogo. Assim confirmamos que o pedido é seu.</li>
      <li>Se você usou outro @ no chat ao vivo do site, informe esse @ na mensagem.</li>
    </ol>
    <p>Respondemos e concluímos a exclusão em até <strong>15 dias</strong>, avisando por mensagem direta quando terminar.</p>

    <h2>O que é apagado</h2>
    <ul>
      <li>Sua base: estado, cidade, time, exército, compras, pontos e histórico de pontos.</li>
      <li>Sua posição nos rankings e no mapa.</li>
      <li>As mensagens do chat ao vivo assinadas com o seu @ e os arquivos de áudio delas.</li>
      <li>O código da sua conta do Instagram guardado pelo jogo.</li>
    </ul>

    <h2>O que não depende de nós</h2>
    <ul>
      <li>Seus comentários continuam no Instagram até você apagá-los lá; eles são da plataforma da Meta.</li>
      <li>Guardamos apenas os códigos dos comentários já processados, sem nome nem conta, para que um comentário antigo reenviado pela Meta não recrie sua base.</li>
      <li>Se você comentar de novo no formato do jogo depois da exclusão, uma nova base será criada.</li>
    </ul>

    <p>Mais detalhes na <Link href="/privacidade">Política de Privacidade</Link>.</p>
  </LegalPage>;
}

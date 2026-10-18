import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { INSTAGRAM_URL } from '../../components/legal-page';

export const metadata: Metadata = { title: 'Política de Privacidade · Você é 13 ou 22?', description: 'Quais dados o jogo Você é 13 ou 22? usa, para quê, com quem e como pedir a exclusão.' };

export default function PrivacyPage() {
  return <LegalPage title="Política de Privacidade" current="/privacidade">
    <p>Esta política explica quais dados o jogo <strong>Você é 13 ou 22?</strong> usa, para quê e como você pode pedir a exclusão. O jogo funciona neste site e no perfil <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@vocee13ou22</a> do Instagram e segue a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>

    <h2>1. Quem cuida dos dados</h2>
    <p>O responsável pelo jogo é quem administra o perfil @vocee13ou22. Para qualquer assunto de privacidade, envie uma mensagem direta para esse perfil no Instagram.</p>

    <h2>2. Que dados usamos</h2>
    <ul>
      <li><strong>Quando você comenta nos posts oficiais do @vocee13ou22:</strong> seu nome de usuário do Instagram, o código da sua conta que a Meta envia ao nosso aplicativo, o texto e o código do comentário e a data e hora. Do texto tiramos o estado, a cidade (na Bahia) e o time escolhido (13 ou 22).</li>
      <li><strong>Dentro do jogo:</strong> sua base, pontos, histórico de pontos, unidades do exército, compras e posição nos rankings.</li>
      <li><strong>No chat ao vivo do site:</strong> o nome ou @ que você digitar, o time, o texto do super chat e, se você enviar, a gravação de áudio, com data e hora. Para limitar spam, guardamos um código calculado a partir do endereço de rede de quem enviou; o endereço em si não é guardado.</li>
      <li><strong>No seu navegador:</strong> a demonstração e algumas preferências ficam no armazenamento do próprio navegador e não são enviadas para nós.</li>
    </ul>
    <p>Não pedimos senha, e-mail, telefone, documentos, localização do aparelho, contatos nem suas mensagens diretas. O microfone só é usado quando você aperta para gravar um áudio.</p>

    <h2>3. O que fica público</h2>
    <p>O jogo é público: seu @, estado, cidade, time, exército e pontos aparecem no mapa e nos rankings para qualquer visitante. As mensagens e os áudios do chat ao vivo aparecem para quem estiver no site. Os comentários continuam no Instagram, sob as regras da própria Meta.</p>

    <h2>4. A escolha entre 13 e 22</h2>
    <p className="legal-note">Escolher 13 ou 22 é escolher um time dentro do jogo. Como esses números podem ser associados a partidos políticos, essa escolha pode ser entendida como opinião política, que a LGPD trata como dado sensível. Por isso só usamos essa escolha porque você a fez e publicou por vontade própria no comentário, apenas para o funcionamento do jogo. Não usamos para propaganda direcionada, não vendemos e não repassamos a ninguém. Você pode retirar essa permissão a qualquer momento pedindo a exclusão dos seus dados.</p>

    <h2>5. Para que usamos</h2>
    <ul>
      <li>Criar e mostrar sua base, calcular força, pontos, rankings e a batalha diária.</li>
      <li>Exibir o chat ao vivo e evitar abuso, spam e mensagens repetidas.</li>
      <li>Atender pedidos de acesso, correção e exclusão e cumprir obrigações legais.</li>
    </ul>

    <h2>6. Com quem os dados passam</h2>
    <p>Usamos serviços que guardam ou processam dados em nosso nome: a <strong>Meta</strong> (de onde vêm os comentários do Instagram), o <strong>Supabase</strong> (banco de dados e arquivos de áudio) e a <strong>Vercel</strong> (hospedagem do site). Esses serviços podem guardar dados fora do Brasil. Não vendemos dados e não os compartilhamos para publicidade.</p>

    <h2>7. Por quanto tempo</h2>
    <p>Guardamos os dados do jogo e do chat enquanto a campanha estiver ativa ou até você pedir a exclusão. Depois de apagar uma base, mantemos apenas os códigos dos comentários já processados, sem nome nem conta, para que um comentário antigo reenviado pela Meta não recrie a base.</p>

    <h2>8. Seus direitos</h2>
    <p>Você pode pedir a confirmação de que usamos seus dados, uma cópia deles, correção, exclusão, informações sobre com quem foram compartilhados e retirar sua permissão. Basta enviar uma mensagem direta para @vocee13ou22. Veja também a página <Link href="/exclusao-de-dados">Exclusão de dados</Link>.</p>

    <h2>9. Segurança</h2>
    <p>O banco de dados só é acessado pelo servidor do site, com uma chave que nunca vai para o navegador. O navegador consegue apenas ler as mensagens recentes do chat. Comentários recebidos do Instagram só são aceitos com a assinatura da Meta.</p>

    <h2>10. Menores de idade</h2>
    <p>O jogo segue a idade mínima do Instagram. Se você tem menos de 18 anos, participe com o conhecimento dos seus responsáveis.</p>

    <h2>11. Mudanças nesta política</h2>
    <p>Se esta política mudar, a nova versão será publicada nesta página com a data atualizada.</p>
  </LegalPage>;
}

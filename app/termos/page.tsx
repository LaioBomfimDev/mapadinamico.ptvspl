import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '../../components/legal-page';

export const metadata: Metadata = { title: 'Termos de Uso · Você é 13 ou 22?', description: 'Regras para participar do jogo Você é 13 ou 22? e do chat ao vivo.' };

export default function TermsPage() {
  return <LegalPage title="Termos de Uso" current="/termos">
    <p>Ao comentar nos posts oficiais do @vocee13ou22 ou usar este site, você concorda com estas regras.</p>

    <h2>1. O que é o jogo</h2>
    <p><strong>Você é 13 ou 22?</strong> é um jogo de entretenimento. Cada participante monta uma base no mapa do Brasil, escolhe o time 13 (vermelho) ou 22 (azul) e acumula um exército em miniatura. A batalha diária é uma simulação do jogo, baseada na força total de cada time.</p>
    <p className="legal-note">O jogo não é oficial de nenhum partido, candidato, órgão público ou da Meta/Instagram e não representa pesquisa eleitoral. Imagens e referências a figuras públicas têm caráter de humor e não indicam apoio, patrocínio ou participação dessas pessoas.</p>

    <h2>2. Como participar</h2>
    <ul>
      <li>Comente no post oficial o seu estado e o seu time, por exemplo <strong>SP 22</strong>. Na Bahia, inclua a cidade: <strong>Catu BA 13</strong>.</li>
      <li>Cada conta do Instagram tem uma base. Depois do primeiro comentário, estado, cidade e time ficam fixos.</li>
      <li>Comentários válidos dão pontos do jogo, com limite por dia. Os valores podem mudar enquanto o jogo estiver em teste.</li>
      <li>Pontos e unidades não têm valor em dinheiro, não podem ser vendidos nem trocados fora do jogo.</li>
    </ul>

    <h2>3. Chat ao vivo</h2>
    <p>Ao enviar um super chat ou áudio, você declara que tem direito sobre o conteúdo e entende que ele aparece publicamente para quem estiver no site. Não é permitido:</p>
    <ul>
      <li>ódio, preconceito, ameaças, assédio ou incentivo à violência;</li>
      <li>informações falsas sobre eleições, votação ou urnas;</li>
      <li>dados pessoais de outras pessoas (telefone, endereço, documentos);</li>
      <li>conteúdo sexual, ilegal, spam, propaganda ou links;</li>
      <li>se passar por outra pessoa.</li>
    </ul>

    <h2>4. Moderação</h2>
    <p>Podemos ocultar ou apagar mensagens, áudios e bases que descumpram estas regras, que usem o jogo para fraude (contas falsas, comentários automáticos) ou que atrapalhem os outros participantes, e podemos encerrar a participação de quem insistir nisso.</p>

    <h2>5. Disponibilidade</h2>
    <p>O jogo está em desenvolvimento. Ele pode mudar, ficar fora do ar, ter os valores ajustados ou ser encerrado. Fazemos o possível para manter os dados corretos, mas não garantimos que o site funcione sem interrupções.</p>

    <h2>6. Privacidade</h2>
    <p>O uso dos seus dados está descrito na <Link href="/privacidade">Política de Privacidade</Link>. Para apagar sua participação, veja <Link href="/exclusao-de-dados">Exclusão de dados</Link>.</p>

    <h2>7. Mudanças</h2>
    <p>Estes termos podem ser atualizados. A versão em vigor é sempre a publicada nesta página, com a data no topo.</p>
  </LegalPage>;
}

import type { ReactNode } from 'react';
import Link from 'next/link';
import './legal.css';

export const LEGAL_UPDATED = '17 de outubro de 2026';
export const INSTAGRAM_URL = 'https://www.instagram.com/vocee13ou22/';

const LINKS = [
  { href: '/privacidade', label: 'Privacidade' },
  { href: '/termos', label: 'Termos de uso' },
  { href: '/exclusao-de-dados', label: 'Exclusão de dados' },
];

/** Moldura simples e legível das páginas exigidas pela Meta (privacidade, termos e exclusão de dados). */
export default function LegalPage({ title, current, children }: { title: string; current: string; children: ReactNode }) {
  return <main className="legal">
    <header className="legal-head">
      <Link className="legal-brand" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/war-assets/brand/logo-13-22-128.webp" width={48} height={48} alt="" />
        <span>Você é <b className="t13">13</b> ou <b className="t22">22</b>?</span>
      </Link>
      <nav aria-label="Páginas legais">{LINKS.map(link => <Link key={link.href} href={link.href} aria-current={link.href === current ? 'page' : undefined}>{link.label}</Link>)}</nav>
    </header>
    <article className="legal-body">
      <h1>{title}</h1>
      <p className="legal-updated">Última atualização: {LEGAL_UPDATED}</p>
      {children}
    </article>
    <footer className="legal-foot">
      <Link href="/">Voltar ao mapa</Link>
      <span>Contato: mensagem direta para <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@vocee13ou22</a> no Instagram</span>
    </footer>
  </main>;
}

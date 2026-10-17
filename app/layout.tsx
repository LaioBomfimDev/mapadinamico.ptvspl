import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Você é 13 ou 22?",
  description: "Escolha 13 ou 22, monte sua base no Brasil em miniatura e acompanhe a batalha ao vivo. Protótipo do Projeto 2.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}

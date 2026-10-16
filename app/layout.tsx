import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brasil em Batalha · Projeto 2",
  description: "Explore o Brasil em miniatura, monte uma base e acompanhe a batalha entre dois exércitos. Protótipo do Projeto 2.",
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

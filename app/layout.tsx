import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projeto 2",
  description: "Projeto 2: base do mapa 3D para um novo protótipo de batalha.",
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

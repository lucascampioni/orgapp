import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumina - Painel para professoras de inglês",
  description:
    "Alunos, aulas, vocabulário e pagamentos num só lugar, com resumo automático das aulas por IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg text-ink">
        {/* Lê a preferência de tema antes da primeira pintura, pra não
            piscar claro->escuro quando o usuário já escolheu escuro. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try {
            if (localStorage.getItem('theme') === 'dark') {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          } catch (e) {}`}
        </Script>
        {children}
      </body>
    </html>
  );
}

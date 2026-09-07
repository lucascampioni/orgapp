import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
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

import './globals.css';
import { AppShell } from '../components/layout/app-shell';

export const metadata = {
  title: 'Open Finança - Gestão Financeira Inteligente',
  description: 'Controle de contas, conciliação de faturas, classificação de custos e motor de quitação de dívidas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import './globals.css';
import { Sidebar } from '../components/layout/sidebar';

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
      <body className="bg-[#090d16] text-slate-100 flex min-h-screen antialiased">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}

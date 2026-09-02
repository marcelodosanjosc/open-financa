'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  WalletCards,
  CreditCard,
  TrendingDown,
  UploadCloud,
  PieChart,
  ShieldCheck,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { href: '/contas', label: 'Contas Bancárias', icon: WalletCards },
  { href: '/cartoes', label: 'Cartões & Faturas', icon: CreditCard },
  { href: '/simulador-dividas', label: 'Quitação de Dívidas', icon: TrendingDown },
  { href: '/orcamentos', label: 'Orçamentos & Metas', icon: PieChart },
  { href: '/importacao', label: 'Importação em Lote', icon: UploadCloud },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950/80 border-r border-slate-800/80 flex flex-col h-screen sticky top-0 backdrop-blur-xl z-20">
      {/* Brand header */}
      <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <ShieldCheck className="w-6 h-6 text-slate-950 font-bold" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-1.5">
            Open <span className="text-emerald-400">Finança</span>
          </h1>
          <p className="text-xs text-slate-400">Gestão & Liberdade Financeira</p>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Menu Principal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/40">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold flex items-center justify-center text-sm border border-emerald-500/30">
            OF
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Usuário Principal</p>
            <p className="text-[11px] text-slate-400 truncate">Single-User Local</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

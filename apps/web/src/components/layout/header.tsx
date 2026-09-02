'use client';

import React from 'react';
import { PlusCircle, CreditCard, UploadCloud } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenNewTransaction?: () => void;
  onOpenNewInstallment?: () => void;
}

export function Header({
  title,
  subtitle,
  onOpenNewTransaction,
  onOpenNewInstallment,
}: HeaderProps) {
  return (
    <header className="px-8 py-6 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {onOpenNewTransaction && (
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Nova Transação
          </button>
        )}

        {onOpenNewInstallment && (
          <button
            onClick={onOpenNewInstallment}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <CreditCard className="w-4 h-4" />
            Compra Parcelada
          </button>
        )}

        <Link
          href="/importacao"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-medium text-sm transition-all active:scale-95"
        >
          <UploadCloud className="w-4 h-4 text-emerald-400" />
          Importar Extrato
        </Link>
      </div>
    </header>
  );
}

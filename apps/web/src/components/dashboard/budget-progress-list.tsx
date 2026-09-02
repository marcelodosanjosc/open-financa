'use client';

import React from 'react';
import { BudgetResponseDto } from '@repo/shared';
import { formatCurrency } from '../../lib/utils';
import { Target, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface BudgetProgressListProps {
  budgets: BudgetResponseDto[];
}

export function BudgetProgressList({ budgets }: BudgetProgressListProps) {
  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100">Metas & Orçamentos do Mês</h3>
            <p className="text-xs text-slate-400">Controle de limites por categoria</p>
          </div>
        </div>

        <Link
          href="/orcamentos"
          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
        >
          Gerenciar Metas →
        </Link>
      </div>

      {budgets.length > 0 ? (
        <div className="space-y-4">
          {budgets.slice(0, 5).map((b) => {
            const pct = Math.min(100, b.consumedPercentage);
            const isExceeded = b.isExceeded;
            const isWarning = b.consumedPercentage >= 80 && !isExceeded;

            let barColor = 'bg-emerald-500';
            if (isExceeded) barColor = 'bg-rose-500';
            else if (isWarning) barColor = 'bg-amber-500';

            return (
              <div key={b.id} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    {b.categoryName}
                    {isExceeded && (
                      <span title="Limite estourado">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      </span>
                    )}
                  </span>
                  <span className="text-slate-400 font-mono">
                    <span className={isExceeded ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                      {formatCurrency(b.spentAmount)}
                    </span>{' '}
                    / {formatCurrency(b.monthlyLimit)}
                  </span>
                </div>

                <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden flex">
                  <div
                    className={`${barColor} h-full rounded-full transition-all duration-300`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>{b.consumedPercentage}% utilizado</span>
                  <span>
                    {isExceeded
                      ? `Excedido em ${formatCurrency(Math.abs(b.remainingAmount))}`
                      : `Restam ${formatCurrency(b.remainingAmount)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center">
          <p className="text-xs text-slate-400 mb-2">Nenhum orçamento configurado para este mês.</p>
          <Link
            href="/orcamentos"
            className="inline-block px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400"
          >
            + Definir primeiro orçamento
          </Link>
        </div>
      )}
    </div>
  );
}

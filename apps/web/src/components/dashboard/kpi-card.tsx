'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface KpiCardProps {
  title: string;
  amount: number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'indigo' | 'rose' | 'amber' | 'cyan';
  isPositiveGood?: boolean;
}

export function KpiCard({
  title,
  amount,
  subtitle,
  icon: Icon,
  variant = 'emerald',
}: KpiCardProps) {
  const variantStyles = {
    emerald: {
      border: 'hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      glow: 'from-emerald-500/10 to-transparent',
    },
    indigo: {
      border: 'hover:border-indigo-500/40',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      glow: 'from-indigo-500/10 to-transparent',
    },
    rose: {
      border: 'hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      glow: 'from-rose-500/10 to-transparent',
    },
    amber: {
      border: 'hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      glow: 'from-amber-500/10 to-transparent',
    },
    cyan: {
      border: 'hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      glow: 'from-cyan-500/10 to-transparent',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`glass-card p-6 rounded-2xl relative overflow-hidden transition-all duration-200 ${style.border} group`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${style.glow} rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity`}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            {formatCurrency(amount)}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

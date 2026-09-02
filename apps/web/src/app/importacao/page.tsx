'use client';

import React from 'react';
import { Header } from '../../components/layout/header';
import { FileUploader } from '../../components/statement-import/file-uploader';
import { UploadCloud, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export default function ImportPage() {
  return (
    <div>
      <Header
        title="Importação em Lote de Extratos & Faturas"
        subtitle="Processamento inteligente de OFX, CSV e PDFs de fatura de cartão com deduplicação por hash SHA-256"
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Info Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">Deduplicação Atômica</h4>
              <p className="text-xs text-slate-400 mt-1">
                Garante que transações já importadas (FITID ou hash SHA-256) nunca sejam duplicadas.
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">PDFs com Parcelas</h4>
              <p className="text-xs text-slate-400 mt-1">
                Identifica parcelas no formato (ex: 02/10) e calcula a linha do tempo automaticamente.
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">Conferência em Pré-visualização</h4>
              <p className="text-xs text-slate-400 mt-1">
                Revise as transações, ajuste categorias e confirme antes de persistir no banco de dados.
              </p>
            </div>
          </div>
        </div>

        {/* Batch File Uploader Component */}
        <FileUploader />
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Trash2,
  Sparkles,
  Bot,
} from 'lucide-react';
import {
  BatchParseResultDto,
  ParsedTransactionPreviewDto,
  AccountResponseDto,
  CreditCardResponseDto,
  CategoryResponseDto,
} from '@repo/shared';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';

export function FileUploader() {
  const [fileResult, setFileResult] = useState<BatchParseResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<AccountResponseDto[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardResponseDto[]>([]);
  const [categories, setCategories] = useState<CategoryResponseDto[]>([]);

  const [targetType, setTargetType] = useState<'account' | 'card'>('account');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCardId, setSelectedCardId] = useState<string>('');

  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());
  const [transactionsState, setTransactionsState] = useState<ParsedTransactionPreviewDto[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [accs, cards, cats] = await Promise.all([
          api.getAccounts(),
          api.getCreditCards(),
          api.getCategories(true),
        ]);
        setAccounts(accs);
        setCreditCards(cards);
        setCategories(cats);
        if (accs.length > 0) setSelectedAccountId(accs[0].id);
        if (cards.length > 0) setSelectedCardId(cards[0].id);
      } catch (err) {
        console.error('Error loading initial data for import:', err);
      }
    }
    loadData();
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await api.previewImportFile(file);
      setFileResult(result);
      setTransactionsState(result.transactions);

      // Auto set targetType based on format
      if (result.format === 'PDF') {
        setTargetType('card');
      } else {
        setTargetType('account');
      }

      // Auto select non-duplicates
      const initialSelected = new Set<string>();
      result.transactions.forEach((tx) => {
        if (!tx.isDuplicate) {
          initialSelected.add(tx.tempId);
        }
      });
      setSelectedTxIds(initialSelected);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/x-ofx': ['.ofx'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
    },
  });

  const toggleSelectAll = () => {
    if (selectedTxIds.size === transactionsState.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(transactionsState.map((t) => t.tempId)));
    }
  };

  const toggleSelectOne = (tempId: string) => {
    const next = new Set(selectedTxIds);
    if (next.has(tempId)) {
      next.delete(tempId);
    } else {
      next.add(tempId);
    }
    setSelectedTxIds(next);
  };

  const updateCategoryForTx = (tempId: string, categoryId: string) => {
    setTransactionsState((prev) =>
      prev.map((t) =>
        t.tempId === tempId
          ? { ...t, suggestedCategoryId: categoryId, isAiSuggested: false }
          : t,
      ),
    );
  };

  const handleAiClassify = async () => {
    if (transactionsState.length === 0) return;

    setIsClassifying(true);
    setError(null);

    try {
      const res = await api.aiClassifyTransactions(
        transactionsState.map((t) => ({
          tempId: t.tempId,
          description: t.description,
          amount: t.amount,
          type: t.type,
        })),
      );

      const map = new Map<string, { categoryId: string; confidence: number }>();
      res.classifications.forEach((c) => {
        map.set(c.tempId, { categoryId: c.categoryId, confidence: c.confidence });
      });

      setTransactionsState((prev) =>
        prev.map((t) => {
          const match = map.get(t.tempId);
          if (match) {
            return {
              ...t,
              suggestedCategoryId: match.categoryId,
              isAiSuggested: true,
              confidence: match.confidence,
            };
          }
          return t;
        }),
      );

      const sourceLabel =
        res.source === 'ollama' ? 'Ollama Local' : 'Motor Heurístico de Alta Precisão';
      setSuccessMessage(
        `✨ ${res.totalClassified} lançamentos foram classificados automaticamente pela IA (${sourceLabel})!`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedTxIds.size === 0) {
      setError('Selecione pelo menos uma transação para importar');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const selectedTxs = transactionsState.filter((t) => selectedTxIds.has(t.tempId));

      const payload = {
        accountId: targetType === 'account' ? selectedAccountId : undefined,
        creditCardId: targetType === 'card' ? selectedCardId : undefined,
        transactions: selectedTxs.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          categoryId: t.suggestedCategoryId || undefined,
          externalId: t.fitid || t.hash,
          installmentNumber: t.installmentNumber,
          totalInstallments: t.totalInstallments,
        })),
      };

      const res = await api.confirmImport(payload);
      setSuccessMessage(res.message);
      setFileResult(null);
      setTransactionsState([]);
      setSelectedTxIds(new Set());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dropzone Container */}
      {!fileResult && (
        <div
          {...getRootProps()}
          className={`glass-card p-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
            isDragActive
              ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
              : 'border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-900/40'
          }`}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 rounded-2xl gradient-emerald mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <UploadCloud className="w-8 h-8 text-slate-950" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 mb-1">
            Arraste seu extrato ou fatura aqui
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-5">
            Suporta arquivos <span className="font-semibold text-emerald-400">.OFX</span> bancários,{' '}
            <span className="font-semibold text-cyan-400">.CSV</span> de extrato e{' '}
            <span className="font-semibold text-indigo-400">.PDF</span> de faturas de cartão.
          </p>

          <div className="flex items-center justify-center gap-3">
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> OFX (FITID Dedup)
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" /> CSV Inteligente
            </span>
            <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> PDF Fatura Cartão
            </span>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="p-8 glass-card rounded-2xl flex items-center justify-center gap-3 text-slate-300">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          <span>Processando arquivo e identificando transações...</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Preview Table & Confirmation */}
      {fileResult && (
        <div className="glass-card p-6 rounded-2xl space-y-6">
          {/* File summary and target selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {fileResult.format}
                </span>
                <h3 className="font-bold text-slate-100">{fileResult.fileName}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {fileResult.totalFound} transações encontradas •{' '}
                <span className="text-emerald-400 font-semibold">
                  {fileResult.newCount} inéditas
                </span>{' '}
                •{' '}
                <span className="text-amber-400 font-semibold">
                  {fileResult.duplicateCount} duplicadas
                </span>
              </p>
            </div>

            {/* Actions: AI Classifier + Target selector */}
            <div className="flex flex-wrap items-center gap-3">
              {/* AI Classify Button */}
              <button
                onClick={handleAiClassify}
                disabled={isClassifying || transactionsState.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isClassifying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                )}
                {isClassifying ? 'Classificando com IA...' : 'Classificar com IA'}
              </button>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-300">Destino:</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
                >
                  <option value="account">Conta Bancária</option>
                  <option value="card">Cartão de Crédito</option>
                </select>
              </div>

              {targetType === 'account' ? (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5"
                >
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => {
                  setFileResult(null);
                  setTransactionsState([]);
                }}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                title="Descartar arquivo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Staging table */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 sticky top-0">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={
                        selectedTxIds.size === transactionsState.length &&
                        transactionsState.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-400"
                    />
                  </th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactionsState.map((tx) => {
                  const isSelected = selectedTxIds.has(tx.tempId);
                  return (
                    <tr
                      key={tx.tempId}
                      className={`hover:bg-slate-900/40 transition-colors ${
                        tx.isDuplicate ? 'opacity-50 bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(tx.tempId)}
                          className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-400"
                        />
                      </td>
                      <td className="p-3 text-slate-300 font-mono text-xs">
                        {formatDate(tx.date)}
                      </td>
                      <td className="p-3 text-slate-200">
                        <div className="font-medium truncate max-w-xs">{tx.description}</div>
                        {tx.totalInstallments && tx.totalInstallments > 1 && (
                          <span className="text-[10px] text-indigo-400 font-mono">
                            Parcela {tx.installmentNumber}/{tx.totalInstallments}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={tx.suggestedCategoryId || ''}
                            onChange={(e) => updateCategoryForTx(tx.tempId, e.target.value)}
                            className={`bg-slate-900 border text-xs rounded px-2 py-1 transition-all ${
                              tx.isAiSuggested
                                ? 'border-purple-500/60 text-purple-200 bg-purple-950/20'
                                : 'border-slate-800 text-slate-300'
                            }`}
                          >
                            <option value="">(Sem categoria)</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          {tx.isAiSuggested && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold flex items-center gap-0.5"
                              title={`Classificado por IA com ${Math.round((tx.confidence || 0.9) * 100)}% de certeza`}
                            >
                              <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                              IA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold">
                        <span
                          className={
                            tx.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'
                          }
                        >
                          {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="p-3">
                        {tx.isDuplicate ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Duplicada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Inédita
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{selectedTxIds.size}</span> de{' '}
              {transactionsState.length} transações selecionadas
            </span>

            <button
              onClick={handleConfirm}
              disabled={loading || selectedTxIds.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Confirmar Importação ({selectedTxIds.size})
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

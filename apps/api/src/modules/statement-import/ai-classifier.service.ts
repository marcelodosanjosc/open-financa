import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AiClassifyResultDto,
  AiClassificationItemDto,
} from '@repo/shared';

@Injectable()
export class AiClassifierService {
  private readonly logger = new Logger(AiClassifierService.name);

  private readonly ollamaUrl =
    process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  private readonly ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

  constructor(private readonly prisma: PrismaService) {}

  async classifyBatch(
    userId: string,
    transactions: Array<{
      tempId: string;
      description: string;
      amount: number;
      type?: string;
    }>,
  ): Promise<AiClassifyResultDto> {
    if (!transactions || transactions.length === 0) {
      return { classifications: [], source: 'heuristics', totalClassified: 0 };
    }

    // 1. Fetch available categories for user
    const categories = await this.prisma.category.findMany({
      where: { userId },
      include: { parent: true },
      orderBy: { name: 'asc' },
    });

    if (categories.length === 0) {
      return { classifications: [], source: 'heuristics', totalClassified: 0 };
    }

    // 2. Fetch recent user transaction history for few-shot learning
    const recentHistory = await this.prisma.transaction.findMany({
      where: { userId, categoryId: { not: null } },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 40,
    });

    // 3. Try Ollama local model first
    try {
      const ollamaResult = await this.callOllama(
        categories,
        recentHistory,
        transactions,
      );
      if (ollamaResult && ollamaResult.length > 0) {
        return {
          classifications: ollamaResult,
          source: 'ollama',
          totalClassified: ollamaResult.length,
        };
      }
    } catch (err) {
      this.logger.warn(
        `Ollama unavailable or failed (${(err as Error).message}). Using intelligent heuristic fallback engine.`,
      );
    }

    // 4. Fallback: Intelligent Heuristics Engine
    const heuristicResults = this.classifyWithHeuristics(
      categories,
      transactions,
    );

    return {
      classifications: heuristicResults,
      source: 'heuristics',
      totalClassified: heuristicResults.length,
    };
  }

  private async callOllama(
    categories: any[],
    history: any[],
    transactions: Array<{ tempId: string; description: string; amount: number }>,
  ): Promise<AiClassificationItemDto[] | null> {
    const categoryOptions = categories.map((c) => ({
      id: c.id,
      name: c.parent ? `${c.parent.name} > ${c.name}` : c.name,
      classification: c.classification,
    }));

    const historySamples = history.slice(0, 15).map((h) => ({
      description: h.description,
      categoryId: h.categoryId,
      categoryName: h.category?.name,
    }));

    const prompt = `Você é um assistente financeiro especialista em categorizar lançamentos de extratos bancários e faturas de cartão de crédito no Brasil.

Categorias disponíveis:
${JSON.stringify(categoryOptions, null, 2)}

Exemplos de histórico de categorização do usuário:
${JSON.stringify(historySamples, null, 2)}

Lançamentos a classificar:
${JSON.stringify(
  transactions.map((t) => ({ tempId: t.tempId, description: t.description })),
  null,
  2,
)}

Retorne ESTRITAMENTE um JSON com o seguinte formato:
{
  "classifications": [
    {
      "tempId": "id-temporario",
      "categoryId": "uuid-da-categoria-escolhida",
      "confidence": 0.95
    }
  ]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(`${this.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: this.ollamaModel,
        messages: [
          {
            role: 'system',
            content:
              'Você é um classificador financeiro automatizado. Responda apenas com o JSON estruturado solicitado.',
          },
          { role: 'user', content: prompt },
        ],
        format: 'json',
        stream: false,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.message?.content || data.response;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const rawClassifications: Array<{
      tempId: string;
      categoryId: string;
      confidence?: number;
    }> = parsed.classifications || [];

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const result: AiClassificationItemDto[] = [];
    for (const item of rawClassifications) {
      if (item.tempId && item.categoryId && categoryMap.has(item.categoryId)) {
        result.push({
          tempId: item.tempId,
          categoryId: item.categoryId,
          categoryName: categoryMap.get(item.categoryId)!,
          confidence: item.confidence || 0.9,
        });
      }
    }

    return result.length > 0 ? result : null;
  }

  public classifyWithHeuristics(
    categories: any[],
    transactions: Array<{
      tempId: string;
      description: string;
      amount: number;
      type?: string;
    }>,
  ): AiClassificationItemDto[] {
    const results: AiClassificationItemDto[] = [];

    const normalize = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Priority-ordered rule dictionary
    const rules: Array<{
      keywords: string[];
      categoryCandidates: string[];
      confidence: number;
    }> = [
      // 1. Saúde / Farmácia (Priority over generic IFD/food)
      {
        keywords: [
          'drogaria',
          'farmacia',
          'paguemenos',
          'pague menos',
          'drogasil',
          'raia',
          'saude',
          'health',
          'check up',
          'medico',
          'laboratorio',
          'exame',
          'hospital',
          'consulta',
          'unimed',
          'hapvida',
          'bom preco',
          'mega popular',
        ],
        categoryCandidates: ['Farmácia', 'Saúde & Cuidados', 'Saúde'],
        confidence: 0.98,
      },
      // 2. Moradia - Internet & Telefonia
      {
        keywords: [
          'tim celular',
          'tim',
          'vivo',
          'claro',
          'oi',
          'telefonia',
          'fibra',
          'internet',
          'net',
          'voucher',
        ],
        categoryCandidates: ['Internet & Telefonia', 'Moradia'],
        confidence: 0.98,
      },
      // 3. Moradia - Contas de Concessionária / Água / Luz
      {
        keywords: [
          'aguas de manaus',
          'aguas',
          'sabesp',
          'copasa',
          'sanepar',
          'corsan',
          'enel',
          'light',
          'energisa',
          'copel',
          'celesc',
          'amazonas energia',
          'energia',
          'concessionaria',
          'aluguel',
          'condominio',
        ],
        categoryCandidates: [
          'Energia & Água',
          'Aluguel & Condomínio',
          'Moradia',
        ],
        confidence: 0.97,
      },
      // 4. Transporte - Apps de Mobilidade & Postos
      {
        keywords: [
          'uber',
          'uberrides',
          'uber cash',
          'uber shopper',
          '99app',
          '99',
          'cabify',
          'posto',
          'combustivel',
          'gasolina',
          'etanol',
          'estacionamento',
          'pedagio',
          'transporte',
          'auto',
        ],
        categoryCandidates: [
          'Transporte Público & Apps',
          'Combustível',
          'Transporte',
        ],
        confidence: 0.98,
      },
      // 5. Alimentação - Supermercados & Atacadistas
      {
        keywords: [
          'assai atacadista',
          'assai',
          'atacadista',
          'atacadao',
          'supermercado',
          'mercado',
          'carrefour',
          'pao de acucar',
          'tupi supermercado',
          'tupi',
          'acougue',
          'casa de carne',
          'padaria',
          'pao e cia',
          'tempus',
          'joaogabrielsoares',
          'heloneida',
        ],
        categoryCandidates: ['Supermercado', 'Alimentação'],
        confidence: 0.97,
      },
      // 6. Alimentação - Restaurantes, Lanchonetes & Delivery
      {
        keywords: [
          'ifd',
          'ifood',
          'rappi',
          'mc donald',
          'mcdonald',
          'subway',
          'subawy',
          'china in box',
          'doceria',
          'acucarada',
          'rei do churra',
          'manaura',
          'claudius',
          'leledosdoces',
          'apoema',
          'restaurante',
          'lanchonete',
          'hamburguer',
          'pizza',
          'delivery',
          'bar',
          'churrascaria',
          'refei',
          'humberto',
          'tapajos',
        ],
        categoryCandidates: ['Restaurantes & Delivery', 'Alimentação'],
        confidence: 0.96,
      },
      // 7. Renda / Entradas / Depósitos / Pix
      {
        keywords: [
          'deposito transferido',
          'deposito',
          'credito adicionado',
          'recebimento pix',
          'pix recebido',
          'salario',
          'provento',
          'rendimento',
          'ted recebida',
        ],
        categoryCandidates: [
          'Salário',
          'Rendimentos & Extras',
          'Renda & Entradas',
        ],
        confidence: 0.98,
      },
      // 8. Lazer & Assinaturas Streaming
      {
        keywords: [
          'spotify',
          'netflix',
          'amazon prime',
          'disney',
          'max',
          'crunchyroll',
          'youtube',
          'google cloud',
          'google one',
          'google',
          'apple',
          'steam',
          'playstation',
          'xbox',
          'cinema',
          'ingresso',
        ],
        categoryCandidates: [
          'Streaming & Assinaturas',
          'Lazer & Estilo de Vida',
          'Lazer',
        ],
        confidence: 0.95,
      },
      // 9. Lazer & Vestuário / Compras
      {
        keywords: [
          'marisa',
          'cea',
          'c a',
          'renner',
          'zara',
          'shein',
          'shopee',
          'aliexpress',
          'magalu',
          'magazine',
          'mercado livre',
          'mercadolivre',
          'studio z',
          'vestuario',
          'calcados',
        ],
        categoryCandidates: [
          'Viagens & Passeios',
          'Lazer & Estilo de Vida',
          'Lazer',
        ],
        confidence: 0.92,
      },
      // 10. Serviços & Educação
      {
        keywords: [
          'kiwify',
          'hotmart',
          'eduzz',
          'udemy',
          'curso',
          'workshop',
          'anuidade',
          'tarifa',
          'seguro',
          'innerai',
        ],
        categoryCandidates: [
          'Streaming & Assinaturas',
          'Lazer & Estilo de Vida',
        ],
        confidence: 0.9,
      },
    ];

    for (const tx of transactions) {
      const descNorm = normalize(tx.description);
      let matchedCategory: any = null;
      let matchedConfidence = 0.85;

      // If transaction is marked as INCOME or has deposit/pix keywords, prioritize Renda
      if (
        tx.type === 'INCOME' ||
        descNorm.includes('deposito') ||
        descNorm.includes('credito adicionado') ||
        descNorm.includes('recebimento pix')
      ) {
        const incomeCat = categories.find((c) =>
          ['salario', 'rendimentos & extras', 'renda & entradas', 'renda'].some(
            (target) => normalize(c.name) === normalize(target),
          ),
        );
        if (incomeCat) {
          matchedCategory = incomeCat;
          matchedConfidence = 0.98;
        }
      }

      // Check rules if not already matched as income
      if (!matchedCategory) {
        for (const rule of rules) {
          const matches = rule.keywords.some((k) =>
            descNorm.includes(normalize(k)),
          );

          if (matches) {
            // Find candidate category in user's category list
            for (const targetName of rule.categoryCandidates) {
              const exact = categories.find(
                (c) => normalize(c.name) === normalize(targetName),
              );
              if (exact) {
                matchedCategory = exact;
                matchedConfidence = rule.confidence;
                break;
              }
            }

            if (!matchedCategory) {
              // Partial search
              const partial = categories.find((c) =>
                rule.categoryCandidates.some((cand) =>
                  normalize(c.name).includes(normalize(cand)),
                ),
              );
              if (partial) {
                matchedCategory = partial;
                matchedConfidence = rule.confidence - 0.05;
              }
            }

            if (matchedCategory) break;
          }
        }
      }

      // Fallback: If still unmatched, look for keywords inside description matching category names directly
      if (!matchedCategory) {
        for (const cat of categories) {
          const catNameNorm = normalize(cat.name);
          if (catNameNorm.length > 3 && descNorm.includes(catNameNorm)) {
            matchedCategory = cat;
            matchedConfidence = 0.75;
            break;
          }
        }
      }

      // Final fallback if truly unknown
      if (!matchedCategory && categories.length > 0) {
        // Choose a reasonable default: If INCOME -> first income, else first variable expense
        if (tx.type === 'INCOME') {
          matchedCategory =
            categories.find((c) => normalize(c.name).includes('renda')) ||
            categories[0];
        } else {
          matchedCategory =
            categories.find((c) =>
              normalize(c.name).includes('restaurantes'),
            ) ||
            categories.find((c) =>
              normalize(c.name).includes('alimentacao'),
            ) ||
            categories[0];
        }
        matchedConfidence = 0.5;
      }

      if (matchedCategory) {
        results.push({
          tempId: tx.tempId,
          categoryId: matchedCategory.id,
          categoryName: matchedCategory.name,
          confidence: matchedConfidence,
        });
      }
    }

    return results;
  }
}

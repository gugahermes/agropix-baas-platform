
import { CommodityType, DailyQuotation, PriceSource, SiloPriceConfig, TransactionType, TransactionSource, Currency } from '../types';
import { MOCK_PRICE_SOURCES, MOCK_TENANTS } from './mockData';
import { ledgerService } from './ledgerService';

// In-memory historical quotations
let quotationsDb: DailyQuotation[] = [];

// Base regional cache (fallback)
let regionalBasePriceCache: Record<string, number> = {
    'BASE_PRICE_REGION_CELEIRO_RS': 124.00
};

export const quotationService = {
  
  getSources: (): PriceSource[] => [...MOCK_PRICE_SOURCES],

  getSourceById: (id: string) => MOCK_PRICE_SOURCES.find(s => s.id === id),

  /**
   * Simula a busca externa da Cotricampo.
   */
  fetchRegionalPrice: async (sourceId: string): Promise<number> => {
    // Simulando delay de rede
    await new Promise(r => setTimeout(r, 400));
    
    if (sourceId === 'src_cotricampo') {
        const currentPrice = 124.00 + (Math.random() * 2 - 1); // Simula variação diária
        regionalBasePriceCache['BASE_PRICE_REGION_CELEIRO_RS'] = currentPrice;
        return currentPrice;
    }
    
    return regionalBasePriceCache['BASE_PRICE_REGION_CELEIRO_RS'];
  },

  /**
   * CORE LOGIC: Calcula o preço final praticado pelo Silo.
   */
  calculateSiloPrice: (config: SiloPriceConfig, source: PriceSource): { final: number, logistics: number, margin: number } => {
    const margin = config.marginType === 'FIXED' 
        ? config.marginValue 
        : (source.basePriceSaca * (config.marginValue / 100));

    const logistics = config.distanceToSourceKm * config.logisticsUnitCost;
    const final = source.basePriceSaca + margin + logistics + config.adjustmentsSaca - config.fixedOperationalCostSaca;

    return { final, logistics, margin };
  },

  /**
   * Gera ou recupera a cotação ativa para um silo.
   */
  getActiveQuotation: (siloId: string, commodity: CommodityType = CommodityType.SOYBEAN): DailyQuotation => {
    const existing = quotationsDb.find(q => q.siloId === siloId && q.commodity === commodity && q.status === 'ACTIVE');
    if (existing) return existing;

    const silo = MOCK_TENANTS.find(t => t.id === siloId);
    
    // Simulação de preço base por commodity
    const basePrices: Record<string, number> = {
        [CommodityType.SOYBEAN]: 124.0,
        [CommodityType.CORN]: 62.0,
        [CommodityType.WHEAT]: 78.0
    };

    const source = quotationService.getSourceById(silo?.priceConfig.activeSourceId || 'src_cotricampo') || MOCK_PRICE_SOURCES[0];
    
    // Ajuste do preço base da fonte para a commodity específica se for soja, senão usa mock
    const adjustedBasePrice = commodity === CommodityType.SOYBEAN ? source.basePriceSaca : basePrices[commodity];

    const calc = silo?.priceConfig 
        ? quotationService.calculateSiloPrice(silo.priceConfig, { ...source, basePriceSaca: adjustedBasePrice })
        : { final: adjustedBasePrice, margin: 0, logistics: 0 };

    const newQuotation: DailyQuotation = {
      id: `q_${Date.now()}_${commodity}`,
      siloId,
      sourceId: source.id,
      commodity,
      basePriceSaca: adjustedBasePrice,
      finalPriceSaca: calc.final,
      finalPriceKg: calc.final / 60, 
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      calculationMetadata: {
          marginApplied: calc.margin,
          logisticsCost: calc.logistics,
          sourceUsed: source.name
      }
    };

    quotationsDb.push(newQuotation);
    return newQuotation;
  },

  /**
   * Retorna todas as cotações ativas para um silo (Soja, Milho, Trigo)
   */
  getAllActiveQuotations: (siloId: string): DailyQuotation[] => {
      return [
          quotationService.getActiveQuotation(siloId, CommodityType.SOYBEAN),
          quotationService.getActiveQuotation(siloId, CommodityType.CORN),
          quotationService.getActiveQuotation(siloId, CommodityType.WHEAT)
      ];
  },

  getHistory: (siloId: string): DailyQuotation[] => {
    return quotationsDb.filter(q => q.siloId === siloId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
};

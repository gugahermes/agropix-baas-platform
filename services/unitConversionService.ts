
/**
 * REGRAS MATEMÁTICAS GLOBAIS - AGROPIX
 * Unidade Canônica (Ledger/BaaS/Fiscal): Quilograma (kg) - Sempre Inteiro
 * Unidade Visual Produtor: Saca (sc) - 60kg
 * Unidade Visual Industrial: Tonelada (ton) - 1.000kg
 */

export const UnitConversionService = {
  KG_PER_SACA: 60,
  KG_PER_TON: 1000,

  // --- CONVERSORES ---

  kgToSacas: (kg: number) => kg / 60,
  kgToTon: (kg: number) => kg / 1000,
  sacasToKg: (sacas: number) => Math.round(sacas * 60),
  tonToKg: (ton: number) => Math.round(ton * 1000),

  // --- FORMATADORES UX (PRODUTOR) ---

  /**
   * Formata sacas para o produtor. 
   * Se for um número exato (kg % 60 === 0), não mostra aproximado.
   * Caso contrário, usa "≈" e 2 casas decimais.
   */
  formatSacas: (kg: number) => {
    const sacas = kg / 60;
    const isExact = kg % 60 === 0;
    const formatted = sacas.toLocaleString('pt-BR', { 
      minimumFractionDigits: isExact ? 0 : 2, 
      maximumFractionDigits: 2 
    });
    return `${isExact ? '' : '≈ '}${formatted} sc`;
  },

  /**
   * Formata KG para auditoria e fiscal. Sempre inteiro.
   */
  formatKg: (kg: number) => {
    return `${Math.round(kg).toLocaleString('pt-BR')} kg`;
  },

  /**
   * Formata Toneladas para visão industrial. 3 casas decimais.
   */
  formatTon: (kg: number) => {
    const ton = kg / 1000;
    return `${ton.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ton`;
  },

  /**
   * Formata valores em Reais no padrão pt-BR (R$ 1.234,56).
   * Usar sempre em vez de toLocaleString()/toFixed() direto no BRL.
   */
  formatBRL: (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

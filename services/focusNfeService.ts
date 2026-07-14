import { CommodityType, FocusNFeEmissionMode } from '../types';

/**
 * Integração com a API real da Focus NFe (doc.focusnfe.com.br) para emissão de
 * NF-e (modelo 55, emitida com e-CPF pelo produtor rural — o que a maioria dos
 * estados chama de NFP-e) referente à remessa de grão da lavoura para o silo.
 *
 * Modo REAL: exige VITE_FOCUS_NFE_TOKEN configurado. Faz a chamada HTTP real
 * para o ambiente de homologação (sandbox) da Focus NFe.
 *
 * IMPORTANTE — antes de usar um token real em produção: variáveis VITE_* são
 * embutidas no bundle JS público (qualquer um pode ler o token abrindo o
 * DevTools). Isso é aceitável para testar em homologação com token de teste,
 * mas para produção o token TEM que morar num backend/proxy (ex.: uma
 * Cloudflare Pages Function ou Vercel serverless function que injeta o token
 * no servidor e nunca o expõe ao navegador). Este arquivo já isola toda
 * chamada HTTP em `callFocusNfeApi` — trocar para "chamar meu backend em vez
 * da Focus NFe direto" é uma mudança de uma linha nesse ponto único.
 *
 * Modo SIMULADO (default, sem token configurado): gera uma resposta com o
 * MESMO formato exato que a Focus NFe devolveria (mesmos campos, chave de
 * acesso de 44 dígitos com dígito verificador real calculado), para que toda
 * a UI e o modelo de dados já estejam prontos — só falta plugar o token real.
 */

const HOMOLOGACAO_BASE_URL = 'https://homologacao.focusnfe.com.br/v2';
const PRODUCAO_BASE_URL = 'https://api.focusnfe.com.br/v2';

// Códigos oficiais do IBGE por UF (usados na chave de acesso da NF-e).
const UF_CODIGO_IBGE: Record<string, string> = {
  MT: '51', RS: '43', PR: '41', SC: '42', SP: '35', MG: '31', GO: '52',
  BA: '29', MS: '50', PI: '22', CE: '23', PA: '15',
};

// NCM (Nomenclatura Comum do Mercosul) por commodity — necessário em todo item da NF-e.
const NCM_POR_COMMODITY: Record<CommodityType, string> = {
  [CommodityType.SOYBEAN]: '12019000', // Soja, mesmo triturada
  [CommodityType.CORN]: '10059010',    // Milho em grão, exceto para semeadura
  [CommodityType.WHEAT]: '10019900',   // Trigo, exceto para semeadura
};

const DESCRICAO_POR_COMMODITY: Record<CommodityType, string> = {
  [CommodityType.SOYBEAN]: 'Soja em grão',
  [CommodityType.CORN]: 'Milho em grão',
  [CommodityType.WHEAT]: 'Trigo em grão',
};

export interface EnderecoFiscal {
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

export interface EmitenteProdutorRural {
  cpf: string;
  nome: string;
  inscricaoEstadual?: string;
  endereco: EnderecoFiscal;
}

export interface DestinatarioSilo {
  cnpj: string;
  nome: string;
  inscricaoEstadual?: string;
  endereco: EnderecoFiscal;
}

export interface EmitirRemessaParams {
  ref: string;
  emitente: EmitenteProdutorRural;
  destinatario: DestinatarioSilo;
  commodity: CommodityType;
  quantidadeKg: number;
  valorUnitarioKg?: number; // opcional — remessa para armazenagem não é venda, mas SEFAZ exige um valor de referência
}

export interface FocusNFeResult {
  mode: FocusNFeEmissionMode;
  ref: string;
  status: 'autorizado' | 'processando_autorizacao' | 'erro_autorizacao';
  statusSefaz?: string;
  mensagemSefaz?: string;
  chaveNFe?: string;
  numero?: string;
  serie?: string;
  caminhoXml?: string;
  caminhoDanfe?: string;
  erros?: { campo?: string; mensagem: string }[];
  warning?: string; // preenchido quando uma tentativa REAL cai de volta para simulação
}

export const focusNfeService = {
  isRealApiConfigured(): boolean {
    return Boolean((import.meta as any).env?.VITE_FOCUS_NFE_TOKEN);
  },

  /** CFOP correto para remessa de produção do produtor rural ao silo (armazenagem, não venda). */
  resolverCfop(ufEmitente: string, ufDestinatario: string): string {
    return ufEmitente === ufDestinatario ? '5905' : '6905';
  },

  buildPayload(params: EmitirRemessaParams) {
    const cfop = focusNfeService.resolverCfop(params.emitente.endereco.uf, params.destinatario.endereco.uf);
    const valorUnitario = params.valorUnitarioKg ?? 1; // valor simbólico de referência para remessa não onerosa
    const valorTotal = Number((valorUnitario * params.quantidadeKg).toFixed(2));

    return {
      natureza_operacao: 'Remessa de produção do estabelecimento rural para armazenagem',
      data_emissao: new Date().toISOString(),
      tipo_documento: 1, // Saída
      finalidade_emissao: 1, // Normal
      local_destino: cfop === '5905' ? 1 : 2, // 1=Interna, 2=Interestadual
      consumidor_final: 0,
      presenca_comprador: 9, // Operação não presencial, outros

      cpf_emitente: params.emitente.cpf.replace(/\D/g, ''),
      nome_emitente: params.emitente.nome,
      inscricao_estadual_emitente: params.emitente.inscricaoEstadual,
      logradouro_emitente: params.emitente.endereco.logradouro,
      numero_emitente: params.emitente.endereco.numero,
      bairro_emitente: params.emitente.endereco.bairro,
      municipio_emitente: params.emitente.endereco.municipio,
      uf_emitente: params.emitente.endereco.uf,
      cep_emitente: params.emitente.endereco.cep.replace(/\D/g, ''),
      regime_tributario_emitente: 3, // Regime normal — produtor rural pessoa física não optante do Simples

      cnpj_destinatario: params.destinatario.cnpj.replace(/\D/g, ''),
      nome_destinatario: params.destinatario.nome,
      inscricao_estadual_destinatario: params.destinatario.inscricaoEstadual,
      indicador_inscricao_estadual_destinatario: 1, // Contribuinte
      logradouro_destinatario: params.destinatario.endereco.logradouro,
      numero_destinatario: params.destinatario.endereco.numero,
      bairro_destinatario: params.destinatario.endereco.bairro,
      municipio_destinatario: params.destinatario.endereco.municipio,
      uf_destinatario: params.destinatario.endereco.uf,
      cep_destinatario: params.destinatario.endereco.cep.replace(/\D/g, ''),

      items: [
        {
          numero_item: 1,
          codigo_produto: params.commodity,
          descricao: DESCRICAO_POR_COMMODITY[params.commodity],
          cfop,
          codigo_ncm: NCM_POR_COMMODITY[params.commodity],
          quantidade_comercial: params.quantidadeKg,
          valor_unitario_comercial: valorUnitario,
          unidade_comercial: 'KG',
          quantidade_tributavel: params.quantidadeKg,
          valor_unitario_tributavel: valorUnitario,
          unidade_tributavel: 'KG',
          valor_bruto: valorTotal,
          inclui_no_total: 1,
          icms_origem: 0,
          icms_situacao_tributaria: '41', // Não tributada (remessa para armazenagem)
          pis_situacao_tributaria: '07',  // Operação isenta da contribuição
          cofins_situacao_tributaria: '07',
        },
      ],
    };
  },

  async emitir(params: EmitirRemessaParams): Promise<FocusNFeResult> {
    const payload = focusNfeService.buildPayload(params);

    if (!focusNfeService.isRealApiConfigured()) {
      return simulateAutorizado(params);
    }

    try {
      const data = await callFocusNfeApi(`/nfe?ref=${encodeURIComponent(params.ref)}`, 'POST', payload);
      return parseRealResponse(params.ref, data);
    } catch (err) {
      // Rede indisponível, CORS bloqueado pelo navegador, ou token inválido —
      // cai para simulação em vez de travar o fluxo do produtor no campo.
      const result = simulateAutorizado(params);
      result.warning = `Falha ao chamar a API real da Focus NFe (${(err as Error).message}). Usando simulação. Em produção isso precisa passar por um backend/proxy, não direto do navegador.`;
      return result;
    }
  },

  async consultar(ref: string): Promise<FocusNFeResult> {
    if (!focusNfeService.isRealApiConfigured()) {
      throw new Error('Consulta real indisponível em modo simulado — a nota já foi resolvida na emissão.');
    }
    const data = await callFocusNfeApi(`/nfe/${encodeURIComponent(ref)}`, 'GET');
    return parseRealResponse(ref, data);
  },
};

async function callFocusNfeApi(path: string, method: 'GET' | 'POST', body?: unknown): Promise<any> {
  const token: string = (import.meta as any).env.VITE_FOCUS_NFE_TOKEN;
  const env: string = (import.meta as any).env.VITE_FOCUS_NFE_ENV || 'homologacao';
  const baseUrl = env === 'producao' ? PRODUCAO_BASE_URL : HOMOLOGACAO_BASE_URL;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Basic Auth: token como usuário, senha vazia — exatamente como a Focus NFe documenta.
      Authorization: `Basic ${btoa(`${token}:`)}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202) {
    throw new Error(data?.mensagem || `Focus NFe respondeu ${response.status}`);
  }
  return data;
}

function parseRealResponse(ref: string, data: any): FocusNFeResult {
  const status = data.status as FocusNFeResult['status'];
  return {
    mode: 'REAL',
    ref,
    status: status || 'processando_autorizacao',
    statusSefaz: data.status_sefaz,
    mensagemSefaz: data.mensagem_sefaz,
    chaveNFe: data.chave_nfe,
    numero: data.numero,
    serie: data.serie,
    caminhoXml: data.caminho_xml_nota_fiscal,
    caminhoDanfe: data.caminho_danfe,
    erros: data.erros?.map((e: any) => ({ campo: e.campo, mensagem: e.mensagem })),
  };
}

function simulateAutorizado(params: EmitirRemessaParams): FocusNFeResult {
  const numero = String(Math.floor(Math.random() * 900000) + 100000);
  const serie = '001';
  const chaveNFe = buildChaveAcessoSimulada({
    uf: params.emitente.endereco.uf,
    cpfOuCnpjEmitente: params.emitente.cpf,
    numero,
    serie,
  });
  return {
    mode: 'SIMULADO',
    ref: params.ref,
    status: 'autorizado',
    statusSefaz: '100',
    mensagemSefaz: 'Autorizado o uso da NF-e (simulado — Focus NFe não configurado)',
    chaveNFe,
    numero,
    serie,
    caminhoDanfe: undefined,
    caminhoXml: undefined,
  };
}

/**
 * Monta uma chave de acesso de 44 dígitos seguindo o layout oficial da NF-e
 * (Manual de Orientação do Contribuinte): cUF(2) AAMM(4) CNPJ/CPF(14) mod(2)
 * serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1), com o dígito verificador (cDV)
 * calculado de verdade via módulo 11 — não é um placeholder aleatório.
 */
function buildChaveAcessoSimulada(params: { uf: string; cpfOuCnpjEmitente: string; numero: string; serie: string }): string {
  const cUF = UF_CODIGO_IBGE[params.uf] || '51';
  const now = new Date();
  const aamm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const doc14 = params.cpfOuCnpjEmitente.replace(/\D/g, '').padStart(14, '0').slice(-14);
  const mod = '55';
  const serie3 = params.serie.padStart(3, '0');
  const nNF9 = params.numero.padStart(9, '0');
  const tpEmis = '1';
  const cNF8 = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');

  const chave43 = `${cUF}${aamm}${doc14}${mod}${serie3}${nNF9}${tpEmis}${cNF8}`;
  const cDV = calcularDigitoVerificadorMod11(chave43);
  return `${chave43}${cDV}`;
}

function calcularDigitoVerificadorMod11(chave43: string): string {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let pesoIndex = 0;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += Number(chave43[i]) * pesos[pesoIndex % pesos.length];
    pesoIndex++;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return String(dv);
}

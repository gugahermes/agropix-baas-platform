
import { NFeDocument, NFeStatus, TransactionType, TransactionSource, Currency, CommodityType, GrainUnit, TransactionStatus } from '../types';
import { INITIAL_NFES, MOCK_ACCOUNTS, MOCK_TENANTS, MOCK_USERS } from './mockData';
import { ledgerService } from './ledgerService';
import { focusNfeService, EnderecoFiscal } from './focusNfeService';

// Endereço de referência para emitente/destinatário — o mock não tem logradouro/CEP,
// só cidade/UF. Placeholder até existir cadastro real de endereço fiscal.
const enderecoMock = (municipio: string, uf: string): EnderecoFiscal => ({
  logradouro: 'Rodovia BR (a definir)',
  numero: 'S/N',
  bairro: 'Zona Rural',
  municipio,
  uf,
  cep: uf === 'MT' ? '78890000' : '98570000',
});

let nfeDatabase: NFeDocument[] = [...INITIAL_NFES];

export const fiscalEngineService = {
  
  // --- READS ---

  getAll: (): NFeDocument[] => {
    return [...nfeDatabase].sort((a,b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  },

  getBySilo: (siloId: string): NFeDocument[] => {
    return nfeDatabase.filter(n => n.siloId === siloId).sort((a,b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  },

  getByProducer: (producerId: string): NFeDocument[] => {
    return nfeDatabase.filter(n => n.producerId === producerId).sort((a,b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  },

  getById: (id: string) => nfeDatabase.find(n => n.id === id),

  // --- ACTIONS ---

  createPreliminaryNFe: async (nfe: Omit<NFeDocument, 'id' | 'status' | 'issuedAt' | 'accessKey' | 'protocol'>): Promise<NFeDocument> => {
    const id = `nfe_${Date.now()}`;

    const producer = MOCK_USERS.find(u => u.id === nfe.producerId);
    const silo = MOCK_TENANTS.find(t => t.id === nfe.siloId);

    let focusResult;
    try {
      focusResult = await focusNfeService.emitir({
        ref: id,
        commodity: nfe.commodity,
        quantidadeKg: nfe.estimatedWeightKg,
        emitente: {
          cpf: producer?.document || '00000000000',
          nome: producer?.name || 'Produtor Rural',
          endereco: enderecoMock(silo?.city || 'Sorriso', silo?.state || 'MT'),
        },
        destinatario: {
          cnpj: silo?.document || '00000000000000',
          nome: silo?.name || 'Silo',
          endereco: enderecoMock(silo?.city || 'Sorriso', silo?.state || 'MT'),
        },
      });
    } catch (err) {
      // Não deixa o produtor travado no campo se a integração fiscal falhar de vez —
      // a NF-e fica marcada como rejeitada para retentativa, mas o app continua funcionando.
      focusResult = {
        mode: 'SIMULADO' as const,
        ref: id,
        status: 'erro_autorizacao' as const,
        mensagemSefaz: (err as Error).message,
      };
    }

    const newNFe: NFeDocument = {
      ...nfe,
      id,
      status: focusResult.status === 'erro_autorizacao' ? NFeStatus.REJECTED : NFeStatus.ISSUED,
      issuedAt: new Date().toISOString(),
      accessKey: focusResult.chaveNFe,
      protocol: focusResult.numero,
      focusRef: focusResult.ref,
      emissionMode: focusResult.mode,
      sefazStatusRaw: focusResult.statusSefaz,
      sefazMessage: focusResult.mensagemSefaz,
      danfeUrl: focusResult.caminhoDanfe,
      xmlUrl: focusResult.caminhoXml,
      rejectionErrors: focusResult.erros,
    };
    nfeDatabase.push(newNFe);

    ledgerService._writeEntry({
      eventId: `evt_nfe_issued_${newNFe.id}`,
      accountId: 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.INTERNAL_TRANSFER,
      description: `NFE_ISSUED: NF ${newNFe.id} em kg (${focusResult.mode})`,
    });

    return newNFe;
  },

  processWeighingAndDigitization: (nfeId: string, finalWeightKg: number) => {
    const nfeIndex = nfeDatabase.findIndex(n => n.id === nfeId);
    if (nfeIndex === -1) throw new Error("NFe not found");

    const nfe = nfeDatabase[nfeIndex];
    if (nfe.status !== NFeStatus.ISSUED && nfe.status !== NFeStatus.WEIGHING) {
      throw new Error("NFe status invalid for digitization");
    }

    const eventId = `evt_dig_${nfe.id}`;
    // Canonical weight is always KG (integer)
    const weightKg = Math.round(finalWeightKg);

    const updatedNfe: NFeDocument = {
      ...nfe,
      finalWeightKg: weightKg,
      status: NFeStatus.CONFIRMED,
      validatedAt: new Date().toISOString(),
      contractId: `ctr_${Date.now()}`, 
      digitizationEventId: eventId
    };
    nfeDatabase[nfeIndex] = updatedNfe;

    const producerAccount = MOCK_ACCOUNTS.find(a => a.ownerId === nfe.producerId && a.type === 'AGRO_WALLET');
    if (!producerAccount) throw new Error("Producer Grain Wallet not found");

    ledgerService._writeEntry({
      eventId,
      accountId: producerAccount.id,
      amount: weightKg,
      currency: Currency.GRAIN_KG,
      direction: TransactionType.CREDIT,
      source: TransactionSource.GRAIN_DIGITIZATION, 
      description: `Digitalização de Grãos (kg) - NF ${nfe.accessKey?.substring(30, 36)}`,
      status: TransactionStatus.CREATED, 
      metadata: { nfeId: nfe.id, commodity: nfe.commodity }
    });

    return updatedNfe;
  },

  cancelNFe: (nfeId: string, reason: string) => {
    const idx = nfeDatabase.findIndex(n => n.id === nfeId);
    if (idx === -1) throw new Error("NFe not found");
    
    if (nfeDatabase[idx].status === NFeStatus.CONFIRMED) {
      throw new Error("Cannot cancel a Digitized NFe.");
    }

    nfeDatabase[idx].status = NFeStatus.CANCELED;
    return nfeDatabase[idx];
  }
};

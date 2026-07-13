
import { NFeDocument, NFeStatus, TransactionType, TransactionSource, Currency, CommodityType, GrainUnit, TransactionStatus } from '../types';
import { INITIAL_NFES, MOCK_ACCOUNTS } from './mockData';
import { ledgerService } from './ledgerService';

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

  createPreliminaryNFe: (nfe: Omit<NFeDocument, 'id' | 'status' | 'issuedAt' | 'accessKey' | 'protocol'>): NFeDocument => {
    const newNFe: NFeDocument = {
      ...nfe,
      id: `nfe_${Date.now()}`,
      status: NFeStatus.ISSUED, 
      issuedAt: new Date().toISOString(),
      accessKey: `512301${Date.now()}12345678000199550010000000011000000000`, 
      protocol: `${Date.now()}`,
    };
    nfeDatabase.push(newNFe);

    ledgerService._writeEntry({
      eventId: `evt_nfe_issued_${newNFe.id}`,
      accountId: 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.INTERNAL_TRANSFER,
      description: `NFE_ISSUED: NF ${newNFe.id} em kg`,
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

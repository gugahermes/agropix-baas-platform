import { 
  DictKeyType, DictEntry, DictAccountType, DictPersonType, 
  TransactionSource, TransactionType, Currency, DictResponseWrapper 
} from '../types';
import { ledgerService } from './ledgerService';

// Official Regex from BACEN OpenAPI 2.8.0
const REGEX_VALIDATION = {
  [DictKeyType.CPF]: /^[0-9]{11}$/,
  [DictKeyType.CNPJ]: /^[0-9]{14}$/,
  [DictKeyType.PHONE]: /^\+[1-9]\d{1,14}$/, // E.164
  [DictKeyType.EMAIL]: /^[a-z0-9.!#$'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/,
  [DictKeyType.EVP]: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
};

// Simulated DICT Database (The "Directory")
const MOCK_DICT_ENTRIES: DictEntry[] = [
  {
    Key: "+5561988880000",
    KeyType: DictKeyType.PHONE,
    Account: {
      Participant: "12345678", // Mock Bank ISPB
      Branch: "0001",
      AccountNumber: "0007654321",
      AccountType: DictAccountType.CACC,
      OpeningDate: "2020-01-10T03:00:00Z"
    },
    Owner: {
      Type: DictPersonType.NATURAL_PERSON,
      TaxIdNumber: "11122233300",
      Name: "João Silva"
    },
    CreationDate: "2023-01-01T10:00:00Z",
    KeyOwnershipDate: "2023-01-01T10:00:00Z"
  },
  {
    Key: "user@agropix.com",
    KeyType: DictKeyType.EMAIL,
    Account: {
      Participant: "87654321", // AgroPix Indirect Participant ISPB
      Branch: "0001",
      AccountNumber: "999999-1",
      AccountType: DictAccountType.TRAN,
      OpeningDate: "2023-05-20T14:30:00Z"
    },
    Owner: {
      Type: DictPersonType.LEGAL_PERSON,
      TaxIdNumber: "12345678000199",
      Name: "AgroPix Soluções Financeiras",
      TradeName: "AgroPix BaaS"
    },
    CreationDate: "2023-06-10T09:15:00Z",
    KeyOwnershipDate: "2023-06-10T09:15:00Z"
  }
];

export const pixService = {

  /**
   * Identifies the key type based on format.
   * Crucial for the initial parsing step in a Pix engine.
   */
  detectKeyType: (key: string): DictKeyType | null => {
    if (REGEX_VALIDATION[DictKeyType.EVP].test(key)) return DictKeyType.EVP;
    if (REGEX_VALIDATION[DictKeyType.PHONE].test(key)) return DictKeyType.PHONE;
    if (REGEX_VALIDATION[DictKeyType.EMAIL].test(key)) return DictKeyType.EMAIL;
    if (REGEX_VALIDATION[DictKeyType.CPF].test(key)) return DictKeyType.CPF;
    if (REGEX_VALIDATION[DictKeyType.CNPJ].test(key)) return DictKeyType.CNPJ;
    return null;
  },

  /**
   * Simulates the `checkKeys` operation from BACEN.
   * Used to bulk verify existence of keys without returning full details.
   */
  checkKeys: async (keys: string[]): Promise<DictResponseWrapper<{ keys: { key: string, hasEntry: boolean }[] }>> => {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network latency

    const results = keys.map(k => ({
      key: k,
      hasEntry: MOCK_DICT_ENTRIES.some(e => e.Key === k)
    }));

    // Audit Log (Compliance)
    ledgerService._writeEntry({
      eventId: `evt_dict_chk_${Date.now()}`,
      accountId: 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.DICT_OPERATION,
      description: `DICT CheckKeys: ${keys.length} keys queried`,
      metadata: { keys }
    });

    return {
      ResponseTime: new Date().toISOString(),
      CorrelationId: crypto.randomUUID().replace(/-/g, ''),
      Signature: "mock_xml_signature_ds",
      Data: { keys: results }
    };
  },

  /**
   * Simulates `getEntry` (Key Resolution).
   * Returns full account details necessary to initiate a payment (pacs.008).
   */
  getEntry: async (key: string, requestingParticipant: string): Promise<DictResponseWrapper<{ Entry: DictEntry }>> => {
    await new Promise(resolve => setTimeout(resolve, 800));

    const entry = MOCK_DICT_ENTRIES.find(e => e.Key === key);

    if (!entry) {
      throw new Error("Entry not found (404)");
    }

    // Audit Log (Compliance - Rate Limiting Tracking would happen here)
    ledgerService._writeEntry({
      eventId: `evt_dict_get_${Date.now()}`,
      accountId: 'acc_baas_master',
      amount: 0,
      currency: Currency.SYSTEM,
      direction: TransactionType.AUDIT,
      source: TransactionSource.DICT_OPERATION,
      description: `DICT GetEntry: ${key} by ${requestingParticipant}`,
    });

    return {
      ResponseTime: new Date().toISOString(),
      CorrelationId: crypto.randomUUID().replace(/-/g, ''),
      Signature: "mock_xml_signature_enveloping_entry",
      Data: { Entry: entry }
    };
  },

  /**
   * Decodes a static or dynamic BR Code (QR Code).
   * Currently mocked to detect standard EMV patterns.
   */
  parseQrCode: (payload: string) => {
    // Basic EMV MPM Validation (starts with 000201)
    if (!payload.startsWith('000201')) {
      return { valid: false, error: 'Invalid EMV Payload Format' };
    }

    // Mock extraction
    return {
      valid: true,
      txId: 'TX1234567890',
      merchantName: 'AgroPeças Ltda',
      merchantCity: 'Sorriso',
      amount: 50.00, // Optional in static QR
      key: '+5561988880000'
    };
  }
};

import React, { useState, useEffect } from 'react';
import { User, NFeDocument, NFeStatus, CommodityType, GrainUnit, TransactionType, TransactionSource, Currency, Tenant, TransactionStatus, PriceSource, SiloPriceConfig, SiloOperationMode, CommodityConfig, IntegrationProtocol, SiloIntegrationSettings } from '../../types';
import { fiscalEngineService } from '../../services/nfeService';
import { coreService } from '../../services/coreService';
import { ledgerService } from '../../services/ledgerService';
import { UnitConversionService } from '../../services/unitConversionService';
import { quotationService } from '../../services/quotationService';
import { 
  LayoutDashboard, Users, FileText, Truck, Database, Settings, 
  Search, Plus, Scale, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Building2, Package, ArrowRight, ArrowLeft,
  ChevronRight, ClipboardList, Info, BarChart3, Clock, RefreshCw,
  Wallet, ShieldCheck, MapPin, Calculator, Save, Navigation, DollarSign, Globe,
  Link as LinkIcon, Download, Zap, Terminal, Layers, Wheat
} from 'lucide-react';

export const SiloDashboard: React.FC<{ user: User }> = ({ user }) => {
  const silo = coreService.getTenantById(user.tenantId || 't1')!;
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'FISCAL' | 'QUOTATION' | 'INTEGRATION' | 'COMMODITIES' | 'CONFIG'>('DASHBOARD');
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(prev => prev + 1);

  // Se o silo não tiver modo definido, forçar Setup Wizard
  const [showSetup, setShowSetup] = useState(!silo.operationMode);

  if (showSetup) {
      return <SiloSetupWizard silo={silo} onComplete={() => { setShowSetup(false); refresh(); }} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'DASHBOARD': return <React.Fragment key={refreshKey}><SiloOperationalDashboard user={user} /></React.Fragment>;
      case 'CLIENTS': 
        return selectedProducerId 
          ? <ProducerDetailView producerId={selectedProducerId} onBack={() => setSelectedProducerId(null)} />
          : <SiloClientsTab user={user} onSelectProducer={setSelectedProducerId} onRefresh={refresh} />;
      case 'FISCAL': return <SiloFiscalTab user={user} onRefresh={refresh} />;
      case 'INTEGRATION': return <IntegrationMigrationTab silo={silo} onRefresh={refresh}/>;
      case 'COMMODITIES': return <CommodityManagementTab silo={silo} onRefresh={refresh}/>;
      case 'QUOTATION': return <React.Fragment key={refreshKey}><QuotationTab user={user} /></React.Fragment>;
      case 'CONFIG': return <SiloComplianceView user={user} onRefresh={refresh} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
      {/* Sidebar Silo */}
      <div className="w-64 bg-sicredi-900 text-sicredi-100 flex flex-col border-r border-sicredi-800">
        <div className="p-6 border-b border-sicredi-800 text-center">
          <h2 className="text-white font-black tracking-widest text-[10px] uppercase opacity-50 mb-1">AgroPix Silo</h2>
          <p className="text-lg font-bold text-white truncate px-2">{silo.name}</p>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1">
            <SidebarItem active={activeTab === 'DASHBOARD'} icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => setActiveTab('DASHBOARD')} />
            
            <div className="px-6 py-3 text-[10px] font-black text-sicredi-300 uppercase tracking-widest">Operacional</div>
            <SidebarItem active={activeTab === 'CLIENTS'} icon={<Users size={18} />} label="Produtores" onClick={() => { setActiveTab('CLIENTS'); setSelectedProducerId(null); }} />
            <SidebarItem active={activeTab === 'FISCAL'} icon={<FileText size={18} />} label="NF-e & Balança" onClick={() => setActiveTab('FISCAL')} />
            
            <div className="px-6 py-3 text-[10px] font-black text-sicredi-300 uppercase tracking-widest">Fintech</div>
            <SidebarItem active={activeTab === 'QUOTATION'} icon={<TrendingUp size={18} />} label="Cotação Regional" onClick={() => setActiveTab('QUOTATION')} />
            
            <div className="px-6 py-3 text-[10px] font-black text-sicredi-300 uppercase tracking-widest">Configurações</div>
            <SidebarItem active={activeTab === 'INTEGRATION'} icon={<Zap size={18} />} label="Integração & Sync" onClick={() => setActiveTab('INTEGRATION')} />
            <SidebarItem active={activeTab === 'COMMODITIES'} icon={<Wheat size={18} />} label="Commodities" onClick={() => setActiveTab('COMMODITIES')} />
            <SidebarItem active={activeTab === 'CONFIG'} icon={<ShieldCheck size={18} />} label="Compliance" onClick={() => setActiveTab('CONFIG')} />
          </nav>
        </div>

        <div className="p-4 bg-sicredi-950 border-t border-sicredi-800">
             <div className="flex items-center gap-2 text-[9px] font-black text-sicredi-300 uppercase tracking-tighter">
                <div className={`w-2 h-2 rounded-full ${silo.operationMode === SiloOperationMode.NATIVE ? 'bg-sicredi-500' : 'bg-sicredi-500'}`}></div>
                Modo: {silo.operationMode}
             </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto h-full">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ active, icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all ${
      active 
        ? 'bg-sicredi-800 text-white border-l-4 border-sicredigold-500'
        : 'text-sicredi-200 hover:text-white hover:bg-sicredi-800 border-l-4 border-transparent'
    }`}
  >
    {icon}
    {label}
  </button>
);

// --- MODULO: SETUP WIZARD ---

const SiloSetupWizard = ({ silo, onComplete }: { silo: Tenant, onComplete: () => void }) => {
    const [step, setStep] = useState(1);
    const [mode, setMode] = useState<SiloOperationMode>(silo.operationMode || SiloOperationMode.NATIVE);

    const handleSave = () => {
        coreService.updateSiloSettings(silo.id, { operationMode: mode });
        onComplete();
    };

    return (
        <div className="min-h-screen bg-sicredi-950 flex items-center justify-center p-6">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-10 border-b">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-sicredi-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Settings size={28}/>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Setup Inicial do Silo</h2>
                            <p className="text-slate-400 font-medium">Configure como o AgroPix operará com seu sistema legado.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="p-1 bg-slate-100 rounded-2xl grid grid-cols-3 gap-2">
                             <ModeOption active={mode === SiloOperationMode.INTEGRATION} label="Integração" onClick={() => setMode(SiloOperationMode.INTEGRATION)} />
                             <ModeOption active={mode === SiloOperationMode.HYBRID} label="Híbrido" onClick={() => setMode(SiloOperationMode.HYBRID)} />
                             <ModeOption active={mode === SiloOperationMode.NATIVE} label="Nativo" onClick={() => setMode(SiloOperationMode.NATIVE)} />
                        </div>

                        <div className="p-6 bg-sicredi-50 rounded-[32px] border border-sicredi-100">
                            {mode === SiloOperationMode.INTEGRATION && (
                                <p className="text-sm text-sicredi-900 font-medium"><strong>Modo Integração:</strong> O AgroPix funciona como uma camada de liquidez. Seus dados de saldo e produtores vêm 100% do seu sistema ERP atual via API ou Sincronização.</p>
                            )}
                            {mode === SiloOperationMode.HYBRID && (
                                <p className="text-sm text-sicredi-900 font-medium"><strong>Modo Híbrido:</strong> Você mantém seu sistema legado para balança e recebimento, mas usa o AgroPix para a gestão financeira e digitalização definitiva.</p>
                            )}
                            {mode === SiloOperationMode.NATIVE && (
                                <p className="text-sm text-sicredi-900 font-medium"><strong>Modo Nativo:</strong> O AgroPix assume como sistema operacional principal. Gestão total de produtores, NF-e, Balança e Estoque Digital dentro da plataforma.</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 flex justify-end">
                    <button onClick={handleSave} className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black flex items-center gap-2 hover:bg-black transition-all shadow-xl">
                        Concluir Configuração <ArrowRight size={20}/>
                    </button>
                </div>
            </div>
        </div>
    )
}

const ModeOption = ({ active, label, onClick }: any) => (
    <button onClick={onClick} className={`py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
        {label}
    </button>
);

// --- MODULO: INTEGRAÇÃO & MIGRAÇÃO ---

const IntegrationMigrationTab = ({ silo, onRefresh }: { silo: Tenant, onRefresh: () => void }) => {
    const [tab, setTab] = useState<'SYNC' | 'MAPPING' | 'LOGS'>('SYNC');
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncNow = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            alert("Sincronização concluída. 4 produtores atualizados, 0 divergências.");
        }, 2000);
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Integração & Migração Legada</h2>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <LinkIcon size={14} className="text-sicredi-600"/> Connector v1.4 • Ativo via {silo.integrationSettings.protocol}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="p-3 bg-white border rounded-xl hover:bg-slate-50"><Download size={20}/></button>
                    <button onClick={handleSyncNow} disabled={isSyncing} className="bg-sicredi-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                        {isSyncing ? <RefreshCw className="animate-spin" size={18}/> : <RefreshCw size={18}/>}
                        Sincronizar Agora
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden flex flex-col h-[500px]">
                <div className="px-8 border-b bg-slate-50/50 flex gap-8">
                    {['SYNC', 'MAPPING', 'LOGS'].map(t => (
                        <button key={t} onClick={() => setTab(t as any)} className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${tab === t ? 'border-sicredi-600 text-sicredi-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{t}</button>
                    ))}
                </div>

                <div className="p-8 flex-1 overflow-y-auto">
                    {tab === 'SYNC' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-6">
                                <StatCardMini label="Saúde da Sync" value="HEALTHY" status="bg-sicredi-500" />
                                <StatCardMini label="Última Carga" value="14:32 (Hoje)" />
                                <StatCardMini label="Frequência" value={`${silo.integrationSettings.syncIntervalMinutes}m`} />
                            </div>
                            <div className="p-6 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 py-12">
                                <Layers size={48} className="text-slate-300"/>
                                <div>
                                    <h4 className="font-bold text-slate-800">Upload de Arquivo Legacy</h4>
                                    <p className="text-sm text-slate-500 max-w-xs">Arraste seu CSV de exportação do sistema ERP para reconciliar saldos no Ledger AgroPix.</p>
                                </div>
                                <button className="bg-slate-100 text-slate-700 px-6 py-2 rounded-xl font-bold text-sm border hover:bg-slate-200 transition-colors">Selecionar Arquivo</button>
                            </div>
                        </div>
                    )}
                    {tab === 'MAPPING' && (
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 mb-4">Mapeamento de Data Schema</h4>
                            <MappingRow label="ID do Produtor" field="ext_id" value="producer_id" />
                            <MappingRow label="Saldo Canônico (kg)" field="balance_kg" value="saldo_kg" />
                            <MappingRow label="Tipo de Produto" field="prod_type" value="commodity" />
                            <MappingRow label="CPF/CNPJ" field="tax_number" value="document" />
                        </div>
                    )}
                    {tab === 'LOGS' && (
                        <div className="space-y-2">
                             <LogLine time="14:32:01" msg="Sync finalizada com sucesso. ISPB: 123456" type="success" />
                             <LogLine time="14:30:15" msg="Iniciando fetch de 1.400 registros via API" type="info" />
                             <LogLine time="13:30:00" msg="Divergência detectada no Produtor #882. Ledger: 100kg ERP: 105kg" type="warn" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

const MappingRow = ({ label, field, value }: any) => (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <span className="text-xs font-bold text-slate-500 w-1/3">{label}</span>
        <div className="flex-1 bg-white p-2 border rounded-lg font-mono text-[10px] text-slate-400">{field}</div>
        <ArrowRight size={16} className="text-slate-300"/>
        <div className="flex-1 bg-sicredi-50 p-2 border border-sicredi-100 rounded-lg font-mono text-[10px] text-sicredi-600 font-bold">{value}</div>
    </div>
)

const LogLine = ({ time, msg, type }: any) => (
    <div className="p-3 bg-slate-50 rounded-xl flex gap-3 text-[11px] font-mono border border-slate-100">
        <span className="text-slate-400">{time}</span>
        <span className={type === 'warn' ? 'text-sicredigold-600' : type === 'success' ? 'text-sicredi-600' : 'text-slate-700'}>{msg}</span>
    </div>
)

// --- MODULO: GESTÃO DE COMMODITIES ---

const CommodityManagementTab = ({ silo, onRefresh }: { silo: Tenant, onRefresh: () => void }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Gestão de Commodities</h2>
                    <p className="text-slate-500 font-medium">Defina as unidades visuais e regras fiscais por cultura.</p>
                </div>
                <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                    <Plus size={18}/> Nova Commodity
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {silo.commodities.map(c => (
                    <div key={c.id} className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 transition-transform group-hover:scale-125">
                            <Wheat size={80}/>
                        </div>
                        <div className="flex justify-between items-start">
                             <div>
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{c.id}</span>
                                <h3 className="text-2xl font-black text-slate-900 mt-2">{c.name}</h3>
                             </div>
                             <button className="text-slate-400 hover:text-slate-900 transition-colors"><Settings size={20}/></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Unidade Visual</p>
                                <p className="font-bold text-slate-800">{c.unitVisual}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Peso da Unidade</p>
                                <p className="font-bold text-slate-800">{c.kgPerUnit} kg</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-dashed">
                             <span className="text-xs font-bold text-slate-400 italic">Safra Ativa: {c.activeSafra}</span>
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-sicredi-500"></div>
                                <span className="text-[10px] font-black text-slate-600 uppercase">Operando</span>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// --- COMPONENTES AUXILIARES ---

const StatCardMini = ({ label, value, status }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            {status && <div className={`w-2 h-2 rounded-full ${status}`}></div>}
        </div>
        <p className="text-sm font-bold text-slate-800">{value}</p>
    </div>
)

const QuotationTab = ({ user }: { user: User }) => {
    const silo = coreService.getTenantById(user.tenantId || 't1')!;
    const [config, setConfig] = useState<SiloPriceConfig>({ ...silo.priceConfig });
    const sources = quotationService.getSources();
    const activeSource = sources.find(s => s.id === config.activeSourceId) || sources[0];
    
    const calcResult = quotationService.calculateSiloPrice(config, activeSource);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            coreService.updateSiloSettings(silo.id, { priceConfig: config });
            setIsSaving(false);
            alert("Política de Preço Regional salva com sucesso.");
        }, 1000);
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Motor de Cotações Regional</h2>
                    <p className="text-slate-500 flex items-center gap-2 font-medium">
                        <Globe size={14} className="text-sicredi-600"/>
                        Configure a engenharia de preço. O produtor vê apenas o valor final.
                    </p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-lg"
                >
                    {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                    Salvar e Publicar
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Preço Final (Visualização Admin) */}
                <div className="lg:col-span-1 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Cotação Publicada no APP</p>
                    <h3 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">{UnitConversionService.formatBRL(calcResult.final)}</h3>
                    <p className="text-xs font-bold text-sicredi-600 bg-sicredi-50 px-3 py-1 rounded-full uppercase tracking-widest">Base: {activeSource.name}</p>
                    
                    <div className="mt-8 pt-8 border-t w-full space-y-4">
                         <div className="flex justify-between text-xs font-bold">
                             <span className="text-slate-400 uppercase tracking-widest">Custo Base</span>
                             <span className="text-slate-800">{UnitConversionService.formatBRL(activeSource.basePriceSaca)}</span>
                         </div>
                         <div className="flex justify-between text-xs font-bold">
                             <span className="text-slate-400 uppercase tracking-widest">Spread / Margem</span>
                             <span className={calcResult.margin >= 0 ? 'text-sicredi-500' : 'text-red-500'}>
                                 {calcResult.margin >= 0 ? '+' : ''} {UnitConversionService.formatBRL(calcResult.margin)}
                             </span>
                         </div>
                         <div className="flex justify-between text-xs font-bold">
                             <span className="text-slate-400 uppercase tracking-widest">Logística + Op</span>
                             <span className="text-sicredi-500">+ {UnitConversionService.formatBRL(calcResult.logistics + config.adjustmentsSaca)}</span>
                         </div>
                         <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 mt-2">
                             <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">Valor Canônico Ledger</p>
                             <p className="text-lg font-bold text-slate-700">R$ {(calcResult.final/60).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} / kg</p>
                         </div>
                    </div>
                </div>

                {/* 2. Formulário de Formação de Preço */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                    <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2 mb-6">
                            <Calculator size={16} className="text-sicredi-500"/> Parâmetros de Formação
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Fonte de Referência</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {sources.map(s => (
                                        <button 
                                            key={s.id}
                                            onClick={() => setConfig({...config, activeSourceId: s.id})}
                                            className={`p-4 rounded-2xl border text-left transition-all ${config.activeSourceId === s.id ? 'border-sicredi-600 bg-sicredi-50 ring-2 ring-sicredi-100' : 'border-slate-100 hover:bg-slate-50'}`}
                                        >
                                            <p className="text-xs font-black text-slate-800 uppercase">{s.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{s.region || 'Mercado'}</p>
                                            <p className="mt-2 text-lg font-black text-sicredi-700">{UnitConversionService.formatBRL(s.basePriceSaca)}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Margem</label>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setConfig({...config, marginType: 'FIXED'})}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${config.marginType === 'FIXED' ? 'bg-white shadow-sm' : 'text-slate-400'}`}
                                    >Fixo (R$)</button>
                                    <button 
                                        onClick={() => setConfig({...config, marginType: 'PERCENTAGE'})}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${config.marginType === 'PERCENTAGE' ? 'bg-white shadow-sm' : 'text-slate-400'}`}
                                    >Percentual (%)</button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Valor da Margem</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-sicredi-500"
                                    value={config.marginValue}
                                    onChange={e => setConfig({...config, marginValue: parseFloat(e.target.value)})}
                                />
                            </div>

                            <div className="col-span-2 border-t pt-6">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Logística e Operações</h5>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Distância da Fonte (km)</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                            value={config.distanceToSourceKm}
                                            onChange={e => setConfig({...config, distanceToSourceKm: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Taxa Logística (R$/sc/km)</label>
                                        <input 
                                            type="number" 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                            value={config.logisticsUnitCost}
                                            onChange={e => setConfig({...config, logisticsUnitCost: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-sicredi-50 rounded-[32px] border border-sicredi-100 flex gap-4 items-start text-sicredi-900">
                        <ShieldCheck size={24} className="shrink-0 text-sicredi-600 mt-1"/>
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-widest">Garantia de Compliance</p>
                            <p className="text-[11px] font-medium leading-relaxed">
                                A alteração deste motor afeta imediatamente o valor patrimonial disponível para os produtores vinculados a este silo. O AgroPix BaaS utiliza o valor final como lastro em tempo real.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const SiloOperationalDashboard: React.FC<{ user: User }> = ({ user }) => {
  const silo = coreService.getTenantById(user.tenantId || 't1')!;
  const producers = coreService.getProducersBySilo(user.tenantId || 't1');
  const nfes = fiscalEngineService.getBySilo(user.id);
  
  const pendingCount = nfes.filter(n => n.status === NFeStatus.ISSUED).length;
  const totalGrainKg = producers.reduce((acc, p) => acc + ledgerService.getBalance(p.accountId, Currency.GRAIN_KG), 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dashboard Operacional</h2>
          <p className="text-slate-500 font-medium">Modo {silo.operationMode} • Lastro Industrial Auditado</p>
        </div>
        <div className="bg-sicredi-50 text-sicredi-700 px-4 py-1.5 rounded-xl text-xs font-bold border border-sicredi-100 flex items-center gap-2">
            <Clock size={14} /> Sync Ativa ({silo.integrationSettings.status})
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCardSilo label="Produtores" value={producers.length} icon={<Users size={20}/>} color="bg-sicredi-600" />
        <StatCardSilo label="Fila Balança" value={pendingCount} icon={<Truck size={20}/>} color="bg-sicredigold-600" />
        <StatCardSilo 
            label="Custódia Digital" 
            value={UnitConversionService.formatKg(totalGrainKg)} 
            icon={<Database size={20}/>} 
            color="bg-sicredi-600" 
        />
        <StatCardSilo label="Funding Pool" value={UnitConversionService.formatBRL(ledgerService.getBalance(silo?.liquidityConfig.masterAccountId || '', Currency.BRL))} icon={<Wallet size={20}/>} color="bg-slate-900" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Truck size={18} className="text-sicredi-500"/> Fila de Balança (NF-e)</h3>
          <div className="space-y-3">
             {nfes.filter(n => n.status === NFeStatus.ISSUED).map(n => (
               <div key={n.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-sicredi-300 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl border flex items-center justify-center font-black text-xs uppercase text-slate-500 group-hover:bg-sicredi-50">{n.plate}</div>
                    <div>
                        <p className="text-sm font-black text-slate-800">{UnitConversionService.formatKg(n.estimatedWeightKg)}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{UnitConversionService.formatSacas(n.estimatedWeightKg)}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300"/>
               </div>
             ))}
             {pendingCount === 0 && <div className="p-10 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest">Pátio Livre</div>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center py-12">
            <Zap size={48} className="text-sicredi-200 mb-4"/>
            <h4 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-2">Saúde da Integração</h4>
            <p className="text-xl font-bold text-slate-900">Sincronizado</p>
            <p className="text-xs text-slate-400 mt-1">Legado via {silo.integrationSettings.protocol}</p>
            <button className="mt-6 text-sicredi-600 font-bold text-xs uppercase tracking-widest hover:underline">Ver Logs de Sincronia</button>
        </div>
      </div>
    </div>
  );
};

const StatCardSilo = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform`}></div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-xl font-black text-slate-900 whitespace-nowrap">{value}</div>
    </div>
  </div>
);

const SiloFiscalTab = ({ user, onRefresh }: { user: User, onRefresh: () => void }) => {
    const nfes = fiscalEngineService.getBySilo(user.id);

    const handleValidateAndDigitize = (nfe: NFeDocument) => {
        const kgInput = prompt(`CONFERÊNCIA BALANÇA - PLACA ${nfe.plate}\nPeso NF-e: ${nfe.estimatedWeightKg}kg\n\nPESO REAL BALANÇA (KG):`, nfe.estimatedWeightKg.toString());
        if (kgInput && !isNaN(parseFloat(kgInput))) {
            const kg = Math.round(parseFloat(kgInput));
            fiscalEngineService.processWeighingAndDigitization(nfe.id, kg);
            onRefresh();
            alert(`Lastro Registrado: ${kg} kg.`);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <h2 className="text-xl font-black text-slate-800">Fila Fiscal & Balança</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {nfes.filter(n => n.status === NFeStatus.ISSUED).map(nfe => (
                    <div key={nfe.id} className="bg-white p-6 rounded-[32px] border shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xl font-black text-slate-800">{nfe.plate}</span>
                            <span className="bg-sicredi-100 text-sicredi-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Em Fila</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl text-xs font-bold text-slate-600">
                             Peso NF: {UnitConversionService.formatKg(nfe.estimatedWeightKg)}
                        </div>
                        <button onClick={() => handleValidateAndDigitize(nfe)} className="w-full bg-sicredi-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                            <Scale size={18}/> Validar Balança
                        </button>
                    </div>
                ))}
                {nfes.filter(n => n.status === NFeStatus.ISSUED).length === 0 && (
                    <div className="col-span-2 p-20 text-center text-slate-300 font-black uppercase tracking-widest">Nenhum veículo em fila.</div>
                )}
            </div>
        </div>
    )
}

const SiloComplianceView = ({ user, onRefresh }: any) => (
    <div className="max-w-2xl space-y-6">
        <h2 className="text-2xl font-black tracking-tight text-slate-800">Compliance & Auditoria</h2>
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-8">
            <div className="flex items-center gap-4 p-6 bg-sicredi-50 rounded-[32px] border border-sicredi-100 text-sicredi-800 text-sm font-bold">
                <ShieldCheck size={28}/>
                <p>O silo opera sob a Regra Canônica de Quilogramas (kg). Conversões visuais são arredondadas para UI, mas o lastro contábil é invariável. Toda movimentação é espelhada no Ledger Universal.</p>
            </div>
            
            <div className="space-y-4">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Trilha de Auditoria Recente</h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-[10px] text-slate-500">
                    [Audit] 10:20:00 - Preço Publicado: R$ 131,00/sc <br/>
                    [Admin] 09:15:00 - Onboarding do Silo modo NATIVE <br/>
                    [Audit] 08:30:00 - Sync ERP: 0 falhas em 24 registros
                </div>
            </div>
        </div>
    </div>
)

const SiloClientsTab = ({ user, onSelectProducer, onRefresh }: any) => {
    const producers = coreService.getProducersBySilo(user.tenantId || 't1');
    const silo = coreService.getTenantById(user.tenantId || 't1')!;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800">Carteira de Produtores</h2>
                <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">Exportar CSV</button>
            </div>
            <div className="bg-white rounded-[32px] border overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b uppercase text-[10px] font-black tracking-widest">
                        <tr>
                            <th className="p-5">Produtor</th>
                            <th className="p-5">Custódia (kg)</th>
                            <th className="p-5 text-right">Patrimônio R$</th>
                            <th className="p-5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {producers.map(p => {
                            const balKg = ledgerService.getBalance(p.accountId, Currency.GRAIN_KG);
                            const q = quotationService.getActiveQuotation(user.tenantId!);
                            const val = balKg * q.finalPriceKg;
                            return (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-5">
                                        <p className="font-black text-slate-800 leading-none mb-1">{p.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">{p.document}</p>
                                    </td>
                                    <td className="p-5">
                                        <div className="font-mono font-bold text-slate-900">{Math.round(balKg).toLocaleString('pt-BR')} kg</div>
                                        <div className="text-[10px] text-slate-400 font-bold">{UnitConversionService.formatSacas(balKg)}</div>
                                    </td>
                                    <td className="p-5 text-right text-sicredi-600 font-black">{UnitConversionService.formatBRL(val)}</td>
                                    <td className="p-5 text-right">
                                        <button onClick={() => onSelectProducer(p.id)} className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors">Dossiê</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const ProducerDetailView = ({ producerId, onBack }: any) => {
    const producer = coreService.getUsers().find(u => u.id === producerId);
    if(!producer) return null;
    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-black text-xs uppercase hover:text-slate-800 transition-colors">
                <ArrowLeft size={16}/> Voltar
            </button>
            <div className="bg-white p-10 rounded-[40px] border shadow-sm">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{producer.name}</h2>
                <p className="text-sm text-slate-500 font-mono tracking-widest uppercase mb-8">{producer.document}</p>
                
                <div className="grid grid-cols-2 gap-8 pt-8 border-t">
                    <div className="p-6 bg-slate-50 rounded-[32px]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Finanças</p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold"><span className="text-slate-500">Saldo Agro:</span> <span>R$ 15.000</span></div>
                            <div className="flex justify-between text-xs font-bold"><span className="text-slate-500">Score Interno:</span> <span className="text-sicredi-600">850</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

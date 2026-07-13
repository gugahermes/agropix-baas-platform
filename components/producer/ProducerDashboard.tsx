
import React, { useEffect, useState, useRef } from 'react';
import { User, CommodityType, NFeStatus, Currency, GrainUnit, TransactionStatus, TransactionType, DailyQuotation } from '../../types';
import { ledgerService } from '../../services/ledgerService';
import { fiscalEngineService } from '../../services/nfeService';
import { coreService } from '../../services/coreService';
import { UnitConversionService } from '../../services/unitConversionService';
import { baasOrchestratorService } from '../../services/baasOrchestratorService';
import { quotationService } from '../../services/quotationService';
import { 
  Wallet, Truck, QrCode, ArrowUpRight, ArrowDownRight, Wheat, 
  Sprout, FileText, CheckCircle, RefreshCw, Info,
  ChevronRight, AlertCircle, Scale, Package, Plus, User as UserIcon, Settings, ShieldCheck, HelpCircle, LogOut,
  CreditCard, Camera, Scan, Key, ArrowLeft, Download, X, TrendingUp, ShieldAlert, Lock, ArrowRight, History
} from 'lucide-react';

interface ProducerDashboardProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const ProducerDashboard: React.FC<ProducerDashboardProps> = ({ user, activeTab, setActiveTab }) => {
  const [navStack, setNavStack] = useState<string[]>(['HOME']);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(prev => prev + 1);

  const pushView = (view: string) => setNavStack(prev => [...prev, view]);
  const popView = () => {
    if (navStack.length > 1) {
      setNavStack(prev => prev.slice(0, -1));
    } else {
      setActiveTab('HOME');
    }
  };

  // Sincronização com a Tab Bar inferior
  useEffect(() => {
    if (activeTab === 'PAY_PIX') pushView('PAY_MAIN');
    if (activeTab === 'GRAINS') pushView('GRAINS');
    if (activeTab === 'NFE') pushView('NFE_LIST');
    if (activeTab === 'MENU') pushView('MENU');
    if (activeTab === 'HOME') setNavStack(['HOME']);
  }, [activeTab]);

  const currentView = navStack[navStack.length - 1];

  const renderContent = () => {
    switch (currentView) {
      case 'HOME': return <HomeView user={user} pushView={pushView} key={refreshKey} />;
      case 'GRAINS': return <GrainsListView user={user} pushView={pushView} />;
      case 'GRAIN_DETAIL': return <GrainDetailView user={user} />;
      case 'PAY_MAIN': return <PixAreaView user={user} onBack={popView} refresh={refresh} pushView={pushView}/>;
      case 'PAY_GRAIN': return <PayWithGrainView user={user} onBack={popView} refresh={refresh}/>;
      case 'NFE_LIST': return <NfeListView user={user} pushView={pushView} />;
      case 'NFE_NEW': return <NfeCreateView user={user} onBack={popView} refresh={refresh}/>;
      case 'QUOTATIONS': return <QuotationsListView user={user} />;
      case 'MENU': return <ProfileView user={user} />;
      default: return <HomeView user={user} pushView={pushView} />;
    }
  };

  return (
    <div className="max-w-md mx-auto h-full flex flex-col pb-28 animate-in fade-in duration-300">
      {currentView !== 'HOME' && (
        <div className="flex items-center gap-3 mb-6 px-2">
          <button onClick={popView} className="p-2.5 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-90 transition-transform">
            <ArrowLeft size={20} className="text-slate-900" />
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {currentView === 'GRAINS' && "Meus Grãos"}
            {currentView === 'GRAIN_DETAIL' && "Extrato"}
            {currentView === 'PAY_MAIN' && "Checkout"}
            {currentView === 'PAY_GRAIN' && "Pagar com Grão"}
            {currentView === 'NFE_LIST' && "Minhas Notas"}
            {currentView === 'NFE_NEW' && "Emitir NF-e"}
            {currentView === 'QUOTATIONS' && "Cotações do Dia"}
            {currentView === 'MENU' && "Minha Conta"}
          </h1>
        </div>
      )}
      {renderContent()}
    </div>
  );
};

const HomeView = ({ user, pushView }: any) => {
  const link = baasOrchestratorService.getAllLinks().find(l => l.agroAccountId === user.accountId);
  const grainBalanceKg = ledgerService.getBalance(user.accountId, Currency.GRAIN_KG);
  const quotation = quotationService.getActiveQuotation(user.tenantId);
  
  const sacasText = UnitConversionService.formatSacas(grainBalanceKg);
  const marketValueBrl = grainBalanceKg * quotation.finalPriceKg;
  
  const dailyLimit = link?.dailyLimitBrl || 0;
  const usedToday = link?.usedTodayBrl || 0;
  const availableDaily = dailyLimit - usedToday;

  return (
    <div className="space-y-4 px-1">
      {/* 1. CARTÕES DE LIMITES (Uso Diário e Estendido) */}
      <div className="space-y-3">
        {/* Uso Diário Autorizado */}
        <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uso Diário Autorizado</span>
            <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-full">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[8px] font-black text-green-700 uppercase">Liberado</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-slate-300">R$</span>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">
                {availableDaily.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
             <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min((usedToday/dailyLimit)*100, 100)}%` }}></div>
             </div>
             <span className="text-[8px] font-bold text-slate-400 uppercase">Consumido {(usedToday/dailyLimit*100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Limite Estendido */}
        {link?.extendedLimitBrl && (
           <div className="bg-slate-900 p-4 rounded-[28px] text-white flex justify-between items-center group active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Limite Estendido</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold opacity-30">R$</span>
                    <p className="text-lg font-black tracking-tight">{link.extendedLimitBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="bg-white/10 px-3 py-1 rounded-xl flex items-center gap-2">
                 <span className="text-[8px] font-black uppercase tracking-tighter">Disponível</span>
                 <Lock size={10} className="opacity-40"/>
              </div>
           </div>
        )}
      </div>

      {/* 2. GRÃOS DIGITALIZADOS (Patrimônio) */}
      <div 
        onClick={() => pushView('GRAINS')}
        className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col active:scale-[0.98] transition-all cursor-pointer group relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Wheat size={18}/>
                </div>
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Grãos Digitalizados (Soja)</span>
            </div>
            <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-400 transition-colors"/>
        </div>

        <div className="mb-1">
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
              {sacasText}
          </p>
        </div>
        
        <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado</span>
           <span className="text-xs font-black text-green-600 tracking-tight">{UnitConversionService.formatBRL(marketValueBrl)}</span>
        </div>
      </div>

      {/* 3. GRID DE ATALHOS SECUNDÁRIOS */}
      <div className="grid grid-cols-2 gap-3">
        <HomeShortcutButton 
            icon={<Truck size={20}/>} 
            label="Emitir NF-e" 
            sub="Transporte Campo"
            onClick={() => pushView('NFE_NEW')} 
        />
        <HomeShortcutButton 
            icon={<History size={20}/>} 
            label="Extrato" 
            sub="Histórico de Uso"
            onClick={() => pushView('GRAIN_DETAIL')} 
        />
        <HomeShortcutButton 
            icon={<TrendingUp size={20}/>} 
            label="Cotações" 
            sub="Preços do Dia"
            onClick={() => pushView('QUOTATIONS')} 
        />
        <HomeShortcutButton 
            icon={<Wheat size={20}/>} 
            label="Meus Grãos" 
            sub="Saldo Detalhado"
            onClick={() => pushView('GRAINS')} 
        />
      </div>
      
      {/* 4. FOOTER DISCRETO DE COTAÇÃO PRINCIPAL */}
      <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-[24px] flex items-center justify-between">
         <div className="flex items-center gap-3">
            <TrendingUp size={16} className="text-slate-400"/>
            <div>
                <p className="text-[9px] font-black uppercase text-slate-400 leading-none mb-0.5 tracking-widest">Cotação do dia</p>
                <p className="text-xs font-bold text-slate-700">{UnitConversionService.formatBRL(quotation.finalPriceSaca)} / saca</p>
            </div>
         </div>
         <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">
            Atualizado às {new Date(quotation.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
         </p>
      </div>
    </div>
  );
};

const HomeShortcutButton = ({ icon, label, sub, onClick }: any) => (
    <button onClick={onClick} className="bg-white p-4 rounded-[28px] border border-slate-100 flex items-center gap-3 active:scale-95 transition-all text-left">
        <div className="p-2 bg-slate-50 text-slate-900 rounded-xl">
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-none mb-0.5">{label}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">{sub}</p>
        </div>
    </button>
);

const QuotationsListView = ({ user }: { user: User }) => {
    const quotations = quotationService.getAllActiveQuotations(user.tenantId || 't1');
    
    return (
        <div className="space-y-4 px-2">
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
                {quotations.map((q, idx) => (
                    <div key={idx} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                {q.commodity === CommodityType.SOYBEAN && <Wheat size={20} className="text-amber-600"/>}
                                {q.commodity === CommodityType.CORN && <Sprout size={20} className="text-yellow-600"/>}
                                {q.commodity === CommodityType.WHEAT && <Wheat size={20} className="text-slate-600"/>}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 tracking-tight capitalize">{q.commodity === CommodityType.SOYBEAN ? "Soja" : q.commodity === CommodityType.CORN ? "Milho" : "Trigo"}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preço por saca (60kg)</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-slate-900 tracking-tighter">{UnitConversionService.formatBRL(q.finalPriceSaca)}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Ref: Hoje, {new Date(q.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                ))}
                
                {/* Outros Ativos Mock */}
                <div className="p-6 flex items-center justify-between opacity-50 grayscale">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                            <History size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 tracking-tight">Diesel S10</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preço por Litro</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-slate-900 tracking-tighter">R$ 5,98</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Em Breve</p>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-blue-50/50 rounded-[32px] border border-blue-100 flex items-start gap-4 text-blue-900">
                <Info size={20} className="shrink-0 mt-1 text-blue-600"/>
                <p className="text-[10px] font-medium leading-relaxed">
                    Estes preços são atualizados diariamente pelo seu Silo e servem como referência para a liquidez de seus pagamentos.
                </p>
            </div>
        </div>
    )
}

const PixAreaView = ({ user, refresh, pushView }: any) => {
  const [pixMode, setPixMode] = useState<'MAIN' | 'SCAN' | 'KEY'>('MAIN');
  const [pixKey, setPixKey] = useState('');
  const [amount, setAmount] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      alert("Permissão de câmera negada.");
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      setScanning(false);
    }
  };

  const handlePay = () => {
    if(!amount || !pixKey) return;
    const res = baasOrchestratorService.validateTransaction('lnk_u1_01', parseFloat(amount));
    if(!res.allowed) return alert(`Transação Rejeitada: ${res.reason}`);

    ledgerService.processSplitTransaction(
        'acc_silo_master_01', user.accountId, 'acc_merch_01', 
        parseFloat(amount), parseFloat(amount)*0.015, `Pix Mobile: ${pixKey}`, 't1'
    );
    refresh();
    alert("PIX enviado com sucesso!");
    setPixMode('MAIN');
  }

  if (pixMode === 'SCAN') {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col">
        <div className="p-6 flex justify-between items-center text-white">
          <button onClick={() => { stopCamera(); setPixMode('MAIN'); }}><X size={28}/></button>
          <span className="font-black uppercase text-xs tracking-widest">Leitor AgroPix</span>
          <div className="w-10"></div>
        </div>
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-50" />
          <div className="absolute w-64 h-64 border-2 border-green-500 rounded-[40px] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
             <div className="absolute inset-0 border-4 border-green-500 rounded-[40px] animate-pulse"></div>
          </div>
        </div>
        <div className="p-10 bg-black flex justify-center">
            {!scanning ? (
                <button onClick={startCamera} className="bg-green-600 text-white px-10 py-5 rounded-3xl font-black">Ativar Câmera</button>
            ) : (
                <button onClick={() => { stopCamera(); setPixMode('KEY'); alert("Simulado: Fertilizantes S/A - R$ 1.500,00"); }} className="bg-white text-black px-10 py-5 rounded-3xl font-black">Simular Leitura</button>
            )}
        </div>
      </div>
    );
  }

  if (pixMode === 'KEY') {
    return (
        <div className="bg-white p-8 rounded-[40px] border shadow-2xl space-y-6 animate-in zoom-in-95 mx-2">
            <h3 className="text-2xl font-black text-slate-900">Pagar via Pix</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Chave do Recebedor</label>
                    <input value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-slate-900 outline-none" placeholder="CPF, CNPJ ou E-mail"/>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Valor (R$)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-5 bg-slate-50 border-none rounded-3xl font-black text-4xl placeholder:text-slate-200 outline-none" placeholder="0,00"/>
                </div>
                <button onClick={handlePay} disabled={!amount || !pixKey} className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-all">Confirmar Pagamento</button>
            </div>
        </div>
    )
  }

  return (
    <div className="space-y-4 px-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Selecione o método</p>
        
        <PayOption 
            icon={<QrCode size={28}/>} 
            title="Ler QR Code" 
            sub="Pagar via Pix Scanner" 
            onClick={() => setPixMode('SCAN')}
            color="bg-blue-600"
        />

        <PayOption 
            icon={<Sprout size={28}/>} 
            title="Pagar com Grão" 
            sub="Débito direto do seu saldo" 
            onClick={() => pushView('PAY_GRAIN')}
            color="bg-green-600"
        />

        <PayOption 
            icon={<Key size={28}/>} 
            title="Digitar Chave Pix" 
            sub="Transferência manual" 
            onClick={() => setPixMode('KEY')}
            color="bg-slate-900"
        />
    </div>
  )
};

const PayOption = ({ icon, title, sub, onClick, color }: any) => (
    <button onClick={onClick} className="w-full bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all group">
        <div className="flex items-center gap-4">
            <div className={`${color} text-white p-4 rounded-[20px] shadow-lg group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div className="text-left">
                <p className="font-black text-slate-900 tracking-tight">{title}</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sub}</p>
            </div>
        </div>
        <ArrowRight className="text-slate-200" size={20}/>
    </button>
);

const PayWithGrainView = ({ user, onBack, refresh }: any) => {
  const grainBalanceKg = ledgerService.getBalance(user.accountId, Currency.GRAIN_KG);
  const quotation = quotationService.getActiveQuotation(user.tenantId);
  const [valBrl, setValBrl] = useState('');
  
  const sacasDebit = valBrl ? parseFloat(valBrl) / quotation.finalPriceSaca : 0;
  const kgDebit = UnitConversionService.sacasToKg(sacasDebit);

  const handlePay = () => {
    if (kgDebit > grainBalanceKg) return alert("Saldo insuficiente em grãos.");
    
    ledgerService.payWithGrain(user.accountId, kgDebit, `Liquidação direta via Mobile`);
    refresh();
    alert(`Sucesso! Débito de ${UnitConversionService.formatSacas(kgDebit)} realizado.`);
    onBack();
  };

  return (
    <div className="bg-white p-8 rounded-[40px] border shadow-2xl space-y-6 animate-in zoom-in-95 mx-2">
      <div className="text-center space-y-2">
         <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner"><Sprout size={40}/></div>
         <h3 className="text-2xl font-black text-slate-900 tracking-tight">Pagar com Grão</h3>
         <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">A cotação de hoje é {UnitConversionService.formatBRL(quotation.finalPriceSaca)}</p>
      </div>

      <div className="space-y-4">
        <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Valor da Compra (R$)</label>
            <input type="number" value={valBrl} onChange={e => setValBrl(e.target.value)} className="w-full p-5 bg-slate-50 border-none rounded-3xl font-black text-4xl placeholder:text-slate-200 outline-none" placeholder="0,00"/>
        </div>
        
        <div className="p-6 bg-amber-50 rounded-[28px] border border-amber-100 text-center">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Impacto em Sacas</p>
            <p className="text-3xl font-black text-amber-900 tracking-tight">{UnitConversionService.formatSacas(kgDebit)}</p>
        </div>

        <button onClick={handlePay} disabled={!valBrl || kgDebit > grainBalanceKg} className="w-full bg-green-600 text-white py-5 rounded-[28px] font-black text-lg shadow-xl shadow-green-100 active:scale-95 transition-all">Confirmar Débito</button>
      </div>
    </div>
  );
};

const NfeCreateView = ({ onBack, refresh, user }: any) => {
    const [kg, setKg] = useState('');
    const [plate, setPlate] = useState('');

    const handleEmit = () => {
        if(!kg || !plate) return;
        const kgNum = Math.round(parseFloat(kg));
        
        fiscalEngineService.createPreliminaryNFe({
            producerId: user.id,
            siloId: user.tenantId || 't1',
            commodity: CommodityType.SOYBEAN,
            estimatedWeightKg: kgNum,
            unit: GrainUnit.KG, 
            plate: plate.toUpperCase(),
            gpsCoordinates: { lat: -12.9, lng: -55.4 }
        });
        refresh();
        alert(`NF-e Transmitida com sucesso.`);
        onBack();
    };

    return (
        <div className="bg-white p-8 rounded-[40px] border shadow-2xl space-y-6 animate-in zoom-in-95 mx-2">
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 font-bold">Quantidade (kg)</label>
                    <input type="number" value={kg} onChange={e => setKg(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-2xl outline-none" placeholder="0"/>
                    {kg && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 ml-1 tracking-widest">
                             ≈ {UnitConversionService.formatSacas(parseFloat(kg))} Estimados
                        </p>
                    )}
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Placa do Veículo</label>
                    <input value={plate} onChange={e => setPlate(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black uppercase outline-none" placeholder="ABC-1234"/>
                </div>
                <div className="p-5 bg-blue-50 rounded-[24px] text-[10px] font-black text-blue-800 uppercase leading-relaxed tracking-tighter">
                    Ao confirmar, a NF-e será transmitida via SEFAZ para autorização de transporte campo-silo.
                </div>
                <button onClick={handleEmit} disabled={!kg || !plate} className="w-full bg-blue-600 text-white py-5 rounded-[28px] font-black text-lg shadow-xl shadow-blue-100 uppercase tracking-widest active:scale-95 transition-all">Transmitir SEFAZ</button>
            </div>
        </div>
    )
}

const GrainsListView = ({ user, pushView }: any) => {
    const grainBalanceKg = ledgerService.getBalance(user.accountId, Currency.GRAIN_KG);
    const quotation = quotationService.getActiveQuotation(user.tenantId);
    const marketValueBrl = grainBalanceKg * quotation.finalPriceKg;

    return (
        <div className="space-y-5 px-2">
            <div className="bg-amber-600 p-10 rounded-[48px] text-white shadow-xl shadow-amber-200 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Package size={100}/></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-3">Saldo Disponível</p>
                <h2 className="text-5xl font-black mb-3 leading-none tracking-tighter">{UnitConversionService.formatSacas(grainBalanceKg)}</h2>
                <span className="text-sm font-black opacity-90 uppercase tracking-widest">≈ {UnitConversionService.formatBRL(marketValueBrl)}</span>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-100 divide-y overflow-hidden shadow-sm">
                <div className="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => pushView('GRAIN_DETAIL')}>
                    <div>
                        <p className="font-black text-slate-900 tracking-tight leading-none mb-1">Extrato Completo</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Digitalizações e Débitos</p>
                    </div>
                    <ChevronRight className="text-slate-300" size={20}/>
                </div>
            </div>
        </div>
    )
}

const GrainDetailView = ({ user }: any) => {
    const grainBalanceKg = ledgerService.getBalance(user.accountId, Currency.GRAIN_KG);
    const entries = ledgerService.getEntries(user.accountId).filter(e => e.currency === Currency.GRAIN_KG);

    return (
        <div className="space-y-6 px-2">
            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm text-center space-y-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Patrimônio Líquido</p>
                 <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{UnitConversionService.formatSacas(grainBalanceKg)}</h2>
            </div>
            
            <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Movimentações</h3>
                <div className="bg-white rounded-[32px] border border-slate-100 divide-y overflow-hidden shadow-sm">
                    {entries.map(e => (
                        <div key={e.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div className="max-w-[65%]">
                                <p className="text-sm font-black text-slate-900 leading-tight mb-1 truncate">{e.description}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(e.timestamp).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-black ${e.direction === 'CREDIT' ? 'text-green-600' : 'text-slate-900'}`}>
                                    {e.direction === 'DEBIT' ? '-' : '+'}{Math.round(e.amount).toLocaleString('pt-BR')} kg
                                </p>
                            </div>
                        </div>
                    ))}
                    {entries.length === 0 && <div className="p-10 text-center text-slate-300 font-bold uppercase text-xs">Vazio</div>}
                </div>
            </div>
        </div>
    )
}

const ProfileView = ({ user }: any) => (
    <div className="space-y-6 px-2">
        <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col items-center gap-4 text-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-2 bg-slate-900"></div>
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border-4 border-white shadow-lg"><UserIcon size={48}/></div>
            <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{user.name}</h2>
                <p className="text-xs text-slate-400 font-mono tracking-widest">{user.document}</p>
            </div>
            <div className="bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-green-100">
                Conta Verificada
            </div>
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 divide-y overflow-hidden shadow-sm">
            <ProfileItem icon={<ShieldCheck size={20}/>} label="Segurança & Biometria" />
            <ProfileItem icon={<Settings size={20}/>} label="Preferências" sub="Sacas (60kg)" />
            <ProfileItem icon={<HelpCircle size={20}/>} label="Suporte AgroPix" />
            <button className="w-full p-6 flex items-center gap-4 text-red-500 hover:bg-red-50 transition-colors font-black uppercase text-[10px] tracking-[0.2em]">
                <LogOut size={20}/> Sair do Aplicativo
            </button>
        </div>
    </div>
)

const ProfileItem = ({ icon, label, sub }: any) => (
    <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
        <div className="flex items-center gap-4 text-left">
            <div className="text-slate-400 group-hover:text-slate-900 transition-colors">{icon}</div>
            <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-wider leading-none mb-1">{label}</p>
                {sub && <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">{sub}</p>}
            </div>
        </div>
        <ChevronRight className="text-slate-200" size={18}/>
    </div>
)

const NfeListView = ({ user, pushView }: any) => {
    const nfes = fiscalEngineService.getByProducer(user.id);
    return (
        <div className="space-y-3 px-2">
            <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{nfes.length} Documentos</span>
                <button onClick={() => pushView('NFE_NEW')} className="bg-slate-900 text-white font-black text-[10px] uppercase px-4 py-2 rounded-full tracking-widest active:scale-90 transition-transform">Nova Nota</button>
            </div>
            {nfes.map(n => (
                <div key={n.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center active:scale-[0.98] transition-all">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><FileText size={24}/></div>
                        <div>
                            <p className="font-black text-slate-900 tracking-tight leading-none mb-1">Série {n.accessKey?.substring(30,34)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{n.plate} • {n.commodity}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-slate-900 mb-1">{n.estimatedWeightKg.toLocaleString('pt-BR')} kg</p>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${n.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{n.status}</span>
                    </div>
                </div>
            ))}
            {nfes.length === 0 && <div className="p-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">Nenhuma nota emitida</div>}
        </div>
    )
}


import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { coreService } from './services/coreService';
import { Layout } from './components/Layout';
import { ProducerDashboard } from './components/producer/ProducerDashboard';
import { SiloDashboard } from './components/silo/SiloDashboard';
import { BaaSDashboard } from './components/baas/BaaSDashboard';
import { Leaf, Building2, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('HOME');
  const [showProducerPicker, setShowProducerPicker] = useState(false);

  // Persist session to avoid resetting on refresh
  useEffect(() => {
    const savedUser = sessionStorage.getItem('agropix_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Busca sempre na mesma base compartilhada com o resto do app (coreService),
  // não numa lista estática separada — assim um produtor cadastrado pelo Silo
  // Admin já aparece aqui pra logar, sem precisar tocar em código.
  const handleLogin = (userId: string) => {
    const user = coreService.getUsers().find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem('agropix_user', JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowProducerPicker(false);
    sessionStorage.removeItem('agropix_user');
  };

  if (!currentUser) {
    const producers = coreService.getUsers().filter(u => u.role === UserRole.PRODUCER);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-sicredi-900 via-sicredi-800 to-slate-900 p-4">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-sicredi-500/20 p-2">
              <img src={`${import.meta.env.BASE_URL}logo-icon.png`} alt="AgroPix" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl font-heading font-bold text-white tracking-tight">AgroPix</h1>
          </div>
          <p className="text-sicredi-100/80 font-medium">Plataforma Financeira para o Agronegócio</p>
        </div>

        {!showProducerPicker ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            <LoginCard
              role="Produtor Rural"
              icon={<Leaf size={32} className="text-sicredi-500" />}
              description="Wallet, Pagamentos e NFe Campo"
              onClick={() => setShowProducerPicker(true)}
            />
            <LoginCard
              role="Silo Admin"
              icon={<Building2 size={32} className="text-sicredigold-500" />}
              description="Recebimento e Digitalização"
              onClick={() => handleLogin('u2')}
            />
            <LoginCard
              role="BaaS Admin"
              icon={<ShieldCheck size={32} className="text-sicredi-500" />}
              description="Ledger e Compliance Universal"
              onClick={() => handleLogin('u3')}
            />
          </div>
        ) : (
          <div className="w-full max-w-md space-y-3">
            <button onClick={() => setShowProducerPicker(false)} className="flex items-center gap-2 text-sicredi-100/70 text-xs font-black uppercase tracking-widest mb-2 hover:text-white transition-colors">
              <ArrowLeft size={14}/> Voltar
            </button>
            {producers.map(p => {
              const silo = coreService.getTenantById(p.tenantId || '');
              return (
                <button
                  key={p.id}
                  onClick={() => handleLogin(p.id)}
                  className="w-full bg-white/5 backdrop-blur-sm border border-white/10 p-5 rounded-2xl hover:bg-white/10 hover:border-sicredi-500/50 transition-all text-left flex items-center justify-between group"
                >
                  <div>
                    <p className="text-white font-bold">{p.name}</p>
                    <p className="text-slate-400 text-xs font-mono">{p.document} {silo ? `· ${silo.name}` : '· sem silo vinculado'}</p>
                  </div>
                  <ArrowRight size={18} className="text-sicredi-400 group-hover:translate-x-1 transition-transform"/>
                </button>
              );
            })}
            {producers.length === 0 && (
              <p className="text-center text-slate-400 text-sm p-6">Nenhum produtor cadastrado ainda — peça pro Silo Admin cadastrar um em "Carteira de Produtores".</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Layout 
      user={currentUser} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      {currentUser.role === UserRole.PRODUCER && (
        <ProducerDashboard 
          user={currentUser} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
      )}
      {currentUser.role === UserRole.SILO_ADMIN && <SiloDashboard user={currentUser} />}
      {currentUser.role === UserRole.BAAS_ADMIN && <BaaSDashboard />}
    </Layout>
  );
}

const LoginCard = ({ role, icon, description, onClick }: { role: string; icon: React.ReactNode; description: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/10 hover:border-sicredi-500/50 transition-all text-left group"
  >
    <div className="mb-4 bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-2">{role}</h3>
    <p className="text-slate-400 text-sm">{description}</p>
  </button>
);

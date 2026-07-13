# AgroPix — Plataforma Financeira para o Agronegócio

Protótipo funcional da plataforma AgroPix: o patrimônio do produtor rural, hoje imobilizado dentro dos silos, convertido em garantia digital capaz de originar crédito, pagamentos e investimento.

**Demo ao vivo:** https://gugahermes.github.io/agropix-baas-platform/

A plataforma integra três camadas em um único ecossistema:

- **Produtor Rural** — app financeiro: wallet de grãos digitalizados, pagamentos via PIX, emissão de NF-e de transporte no momento da colheita, cotações do dia.
- **Silo Admin** — sistema operacional de gestão e custódia digital: balança, fila fiscal, gestão de commodities, e três modos de convivência com o ERP legado do silo (Integração / Híbrido / Nativo).
- **BaaS Admin** — infraestrutura financeira central: ledger universal de dupla entrada, liquidação, wallets, compliance, rede de comércios credenciados.

## Stack

React 19 + Vite 6 + TypeScript, Tailwind (classes inline), `lucide-react`. Dados mockados em memória — sem backend real ainda (ver estado técnico abaixo).

## Rodar localmente

**Pré-requisitos:** Node.js 20+

```bash
npm install
npm run dev
```

## Estado do protótipo

100% frontend, sem backend nem base de dados persistente — pensado como especificação funcional clicável, não como base de código para produção. Roadmap completo (o que falta para um MVP real com silo piloto) documentado internamente no vault de projeto.

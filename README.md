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

## Emissão de NF-e (Focus NFe)

A tela "Emitir NF-e" do Produtor Rural já integra com o contrato real da [API da Focus NFe](https://doc.focusnfe.com.br) (autenticação, payload de emissão modelo 55/NFP-e, parsing de resposta). Sem um token configurado, roda em **modo simulado** — mesma forma de resposta da API real, incluindo chave de acesso de 44 dígitos com dígito verificador calculado de verdade (módulo 11), só que sem chamar a SEFAZ.

Para testar com a API real de homologação:

1. Crie uma conta gratuita em [focusnfe.com.br](https://focusnfe.com.br) e gere um token de homologação.
2. Copie `.env.local.example` para `.env.local` e preencha `VITE_FOCUS_NFE_TOKEN`.

⚠️ **Isso é só para teste em homologação.** Variáveis `VITE_*` são embutidas no bundle JS público — qualquer um consegue ler o token pelo DevTools. Para produção, o token precisa morar num backend/proxy (ex.: uma serverless function) que nunca o expõe ao navegador. O código já isola toda chamada HTTP num único ponto (`focusNfeService.ts`) para facilitar essa troca depois.

## Estado do protótipo

100% frontend, sem backend nem base de dados persistente — pensado como especificação funcional clicável, não como base de código para produção. Roadmap completo (o que falta para um MVP real com silo piloto) documentado internamente no vault de projeto.

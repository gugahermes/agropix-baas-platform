# Testes

Suíte de regressão via Playwright (Python) cobrindo os 3 módulos (Produtor Rural, Silo Admin, BaaS Admin) mais o safe-area mobile do iOS.

## Rodar

```bash
npm run dev &
pip install playwright && playwright install chromium webkit
npm test
```

Ou direto: `python3 tests/regression.py [--base-url http://localhost:3001]`

Sai com código != 0 se aparecer qualquer erro de console/pageerror em qualquer módulo. Screenshots ficam em `tests/screenshots/` (git-ignorado).

Cobre explicitamente a regressão do bug de navegação desktop do produtor (bottom nav precisa estar visível em viewport >= 768px, não só mobile) — ver commit `a5a2cf2`.

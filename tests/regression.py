"""
Suíte de regressão do AgroPix — cobre os 3 módulos (Produtor, Silo Admin,
BaaS Admin) e o safe-area mobile do iOS. Roda contra um dev server já
no ar (não sobe/derruba o servidor sozinha).

Uso:
    npm run dev &            # sobe o vite em background (porta 3000/3001)
    pip install playwright && playwright install chromium webkit
    python3 tests/regression.py [--base-url http://localhost:3001]

Sai com código != 0 se qualquer erro de console/pageerror aparecer em
qualquer um dos passos. Screenshots vão para tests/screenshots/ (git-ignorado).
"""
import sys
import os
from playwright.sync_api import sync_playwright

BASE = sys.argv[sys.argv.index("--base-url") + 1] if "--base-url" in sys.argv else "http://localhost:3001"
SHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SHOT_DIR, exist_ok=True)


def run():
    errors = []

    with sync_playwright() as p:
        # --- Desktop Chromium: click-through dos 3 módulos ---
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("console", lambda msg: errors.append(f"[chromium console] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(f"[chromium pageerror] {exc}"))

        # Produtor Rural — home, grãos, pix (nav desktop precisa estar visível)
        page.goto(BASE); page.wait_for_load_state("networkidle")
        page.click("text=Produtor Rural"); page.wait_for_timeout(300)
        page.click("text=João Agricultor"); page.wait_for_load_state("networkidle")
        page.wait_for_timeout(300)
        page.screenshot(path=f"{SHOT_DIR}/producer_home.png")

        # bottom nav deve estar visível em desktop (regressão do bug de nav sumida)
        nav_box = page.locator("nav:has-text('PAGAR')").first.bounding_box()
        if nav_box is None:
            errors.append("[regression] bottom nav do produtor não está visível em viewport desktop (1440x900)")
        else:
            page.locator("nav button[aria-label='Pagar']").click()
            page.wait_for_timeout(300)
            page.screenshot(path=f"{SHOT_DIR}/producer_pix.png")

        # Silo Admin
        page.evaluate("sessionStorage.clear()")
        page.goto(BASE); page.wait_for_load_state("networkidle")
        page.click("text=Silo Admin"); page.wait_for_load_state("networkidle")
        for label in ["Produtores", "NF-e & Balança", "Cotação Regional", "Integração & Sync", "Commodities", "Compliance"]:
            page.click(f"text={label}"); page.wait_for_timeout(200)
        page.screenshot(path=f"{SHOT_DIR}/silo_last_tab.png")

        # BaaS Admin
        page.evaluate("sessionStorage.clear()")
        page.goto(BASE); page.wait_for_load_state("networkidle")
        page.click("text=BaaS Admin"); page.wait_for_load_state("networkidle")
        for label in ["Cross-Integrations", "Contas & Wallets", "Ledger Universal", "Rede Credenciada",
                      "Integradores BaaS", "Painel de Orquestração", "Limites & Políticas", "Auditoria Fiscal"]:
            page.click(f"text={label}"); page.wait_for_timeout(200)
        page.screenshot(path=f"{SHOT_DIR}/baas_last_tab.png")
        browser.close()

        # --- WebKit + iPhone 14 Pro: safe-area mobile ---
        browser2 = p.webkit.launch()
        iphone = p.devices["iPhone 14 Pro"]
        context = browser2.new_context(**iphone)
        page2 = context.new_page()
        page2.on("console", lambda msg: errors.append(f"[webkit console] {msg.text}") if msg.type == "error" else None)
        page2.on("pageerror", lambda exc: errors.append(f"[webkit pageerror] {exc}"))

        page2.goto(BASE); page2.wait_for_load_state("networkidle")
        page2.click("text=Produtor Rural"); page2.wait_for_timeout(300)
        page2.click("text=João Agricultor"); page2.wait_for_load_state("networkidle")
        page2.wait_for_timeout(400)
        page2.screenshot(path=f"{SHOT_DIR}/mobile_home.png")
        page2.click("[aria-label='Pagar']")
        page2.wait_for_timeout(400)
        page2.screenshot(path=f"{SHOT_DIR}/mobile_pagar.png")
        browser2.close()

    print(f"Testado contra {BASE}")
    if errors:
        print(f"\n{len(errors)} erro(s) encontrado(s):")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)
    else:
        print("Regressão limpa — zero erros de console em desktop e mobile.")
        sys.exit(0)


if __name__ == "__main__":
    run()

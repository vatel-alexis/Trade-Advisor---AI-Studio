"""End-to-end check of the running PEA stack (CI `e2e` workflow).

    python -m tests.e2e_smoke [API_URL] [WEB_URL]

Seeds a synthetic PEA report in the database if none exists yet, then checks the API (/health,
/pea, /pea/alert) and the Next.js pages (/ and /pea).
"""

import json
import sys
import urllib.request
from datetime import date

from app.db import SessionLocal
from app.domain import pea as pea_domain
from app.services import pea as pea_service
from tests.test_pea import TODAY, synthetic_history


def fetch(url: str) -> str:
    with urllib.request.urlopen(url, timeout=60) as resp:
        assert resp.status == 200, f"{url} -> {resp.status}"
        return resp.read().decode()


def expect(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"ÉCHEC : {message}")
    print(f"ok  {message}")


def ensure_pea_report() -> None:
    with SessionLocal() as session:
        if pea_service.latest(session) is not None:
            print("ok  rapport PEA déjà présent en base")
            return
        days, index = synthetic_history()
        payload = pea_domain.report(days, index, TODAY)
        pea_service.store(session, payload)
        session.commit()
        print("ok  rapport PEA synthétique enregistré en base")


def check_api(api: str) -> None:
    health = json.loads(fetch(f"{api}/health"))
    expect(health["database"] == "ok", f"API /health : {health}")
    pea_data = json.loads(fetch(f"{api}/pea"))
    expect(pea_data.get("report") is not None, "API /pea renvoie un rapport")
    alert_data = json.loads(fetch(f"{api}/pea/alert"))
    expect("levels" in alert_data, f"API /pea/alert : {alert_data}")


def check_web(web: str) -> None:
    pages = {
        "/": ["Portefeuille PEA", "Répartition cible"],
        "/pea": ["Portefeuille PEA", "Répartition cible"],
    }
    for path, markers in pages.items():
        html = fetch(f"{web}{path}")
        expect("API injoignable" not in html, f"page {path} servie avec l'API")
        missing = [m for m in markers if m not in html]
        expect(not missing, f"page {path} : {markers}" + (f", manque {missing}" if missing else ""))


def main(api: str, web: str) -> None:
    print(f"Vérification E2E PEA le {date.today()}")
    ensure_pea_report()
    check_api(api)
    check_web(web)


if __name__ == "__main__":
    args = sys.argv[1:]
    main(
        args[0] if args else "http://localhost:8000",
        args[1] if len(args) > 1 else "http://localhost:3000",
    )

"""Scheduled jobs, run in their own process (never inside the API's uvicorn workers).

Only the PEA ETF portfolio job remains:
    python -m app.worker            # the scheduler (what the compose `worker` service runs)
    python -m app.worker check      # preflight: database, Yahoo, next runs
    python -m app.worker pea        # recompute the PEA ETF portfolio page now
    python -m app.worker tick       # run PEA refresh if due now (hosted cron)
    python -m app.worker loop       # hourly ticks for a few hours (hosted worker, worker.yml)
"""

import argparse
import logging
import os
import sys
import time
from collections.abc import Callable
from datetime import datetime, timedelta
from datetime import time as dt_time
from zoneinfo import ZoneInfo

from alembic.config import Config
from alembic.script import ScriptDirectory
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import text

from app.db import SessionLocal, engine
from app.marketdata.yahoo import YahooClient
from app.services import pea
from app.services.safety import TICK, record_job

PARIS_TZ = ZoneInfo("Europe/Paris")
PEA = "pea"
# Prices of the day are final a little after the 17:35 close.
PARIS_CLOSE = dt_time(18, 0)
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger("worker")


def _record_failure(job: str, exc: Exception) -> None:
    """Record a job failure in the database."""
    try:
        with SessionLocal() as session:
            record_job(session, job, ok=False, error=f"{exc.__class__.__name__}: {exc}")
            session.commit()
    except Exception:
        logger.exception("could not record the failure of %s", job)


def heartbeat() -> None:
    logger.info("worker alive")
    with SessionLocal() as session:
        record_job(session, TICK, ok=True)
        session.commit()


def pea_refresh() -> None:
    """Recompute the PEA page from Yahoo's daily prices (the ETFs trade in Paris)."""
    today = datetime.now(PARIS_TZ).date()
    try:
        prices, fx = pea.fetch_prices(YahooClient())
        payload = pea.build_report(prices, fx, today)
        with SessionLocal() as session:
            pea.store(session, payload)
            record_job(session, PEA, ok=True)
            session.commit()
    except Exception as exc:
        _record_failure(PEA, exc)
        raise
    logger.info("PEA report as of %s, signal %s", payload["as_of"], payload["signal_day"])


def pea_due(now: datetime, last: datetime | None) -> bool:
    """Right away when no report exists, then once a day after the Euronext close (17:35,
    Paris time); a report computed earlier the same day, before the close, is redone. Weekends
    included: the month-end signal is confirmed on the first day of the new month, often a
    Saturday or Sunday, in time to trade at the next open."""
    if last is None:
        return True
    now, last = now.astimezone(PARIS_TZ), last.astimezone(PARIS_TZ)
    after_close = now.time() >= PARIS_CLOSE
    done = last.date() == now.date() and last.time() >= PARIS_CLOSE
    return after_close and not done


def tick() -> bool:
    """Run the PEA job if due now; returns False if it failed."""
    now = datetime.now(PARIS_TZ)
    with SessionLocal() as session:
        last_pea = pea.last_computed(session)
        record_job(session, TICK, ok=True)
        session.commit()
    jobs = [PEA] if pea_due(now, last_pea) else []
    logger.info("tick %s: %s", now.isoformat(timespec="minutes"), jobs or "nothing due")
    ok = True
    for job in jobs:
        try:
            if job == PEA:
                pea_refresh()
        except Exception:
            logger.exception("%s failed", job)
            ok = False
    return ok


def next_tick_delay(now: datetime) -> float:
    """Seconds until the top of the next hour."""
    top = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    return (top - now).total_seconds()


def loop(
    budget: timedelta,
    clock: Callable[[], datetime] = lambda: datetime.now(PARIS_TZ),
    sleep: Callable[[float], None] = time.sleep,
    run: Callable[[], bool] = tick,
) -> int:
    """Tick on the worker's own clock until `budget` is spent; returns the number of ticks."""
    start = clock()
    ticks = 0
    while True:
        try:
            run()
        except Exception:
            logger.exception("tick failed")
        ticks += 1
        # No idle connection between ticks, so Neon scales to zero.
        engine.dispose()
        now = clock()
        delay = next_tick_delay(now)
        if now + timedelta(seconds=delay) - start > budget:
            return ticks
        sleep(delay)


def build_scheduler() -> BlockingScheduler:
    scheduler = BlockingScheduler(timezone=PARIS_TZ)
    scheduler.add_job(heartbeat, "interval", minutes=5, id="heartbeat")
    scheduler.add_job(
        pea_refresh,
        "cron",
        hour=18,
        minute=5,
        id="pea",
        max_instances=1,
        coalesce=True,
    )
    return scheduler


def check() -> bool:
    """Print one line per dependency of the PEA worker; False if any is not ready."""
    now = datetime.now(PARIS_TZ)
    results: list[bool] = []

    def line(name: str, good: bool, detail: str) -> None:
        results.append(good)
        print(f"[{'ok' if good else 'KO'}] {name:<8} {detail}")

    try:
        with SessionLocal() as session:
            current = session.execute(text("SELECT version_num FROM alembic_version")).scalar()
        config = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
        config.set_main_option("script_location", os.path.join(BACKEND_DIR, "migrations"))
        head = ScriptDirectory.from_config(config).get_current_head()
        line("base", current == head, f"migration {current} (dernière : {head})")
    except Exception as exc:
        line("base", False, f"injoignable ou non migrée : {str(exc)[:200]}")

    try:
        client = YahooClient()
        chart = client.json("/v8/finance/chart/PSP5.PA", range="5d", interval="1d")
        closes = [
            c
            for c in chart["chart"]["result"][0]["indicators"]["quote"][0].get("close", [])
            if c is not None
        ]
        detail = f"PSP5.PA dernier cours {closes[-1]:.2f} EUR" if closes else "aucun cours"
        line("yahoo", bool(closes), detail)
    except Exception as exc:
        line("yahoo", False, str(exc)[:200])

    for job in build_scheduler().get_jobs():
        print(f"     {job.id:<17} prochain passage {job.trigger.get_next_fire_time(None, now)}")
    return all(results)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.worker")
    parser.add_argument("command", nargs="?", choices=["check", "tick", "loop", "pea"])
    parser.add_argument("--minutes", type=int, default=330, help="loop: durée en minutes")
    args = parser.parse_args(argv)
    command = args.command
    logging.basicConfig(level=logging.INFO)
    if command == "check":
        return 0 if check() else 1
    if command == "tick":
        return 0 if tick() else 1
    if command == "loop":
        logger.info("%s tick(s)", loop(timedelta(minutes=args.minutes)))
        return 0
    if command == "pea":
        pea_refresh()
    else:
        build_scheduler().start()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

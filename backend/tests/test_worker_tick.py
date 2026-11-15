from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.worker import loop, next_tick_delay

PARIS = ZoneInfo("Europe/Paris")
MONDAY = date(2026, 10, 5)


def at(hour: int, minute: int, day: date = MONDAY) -> datetime:
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=PARIS)


@pytest.mark.parametrize(
    ("now", "expected"),
    [
        (at(9, 12), 2880.0),
        (at(10, 0), 3600.0),
        (at(10, 30), 1800.0),
        (at(17, 58), 120.0),
        (at(18, 0), 3600.0),
        (at(7, 15), 2700.0),
        (at(10, 0, date(2026, 10, 10)), 3600.0),
    ],
)
def test_next_tick_delay(now: datetime, expected: float) -> None:
    assert next_tick_delay(now) == expected


def test_loop_stops_within_its_budget() -> None:
    clock = [at(9, 0)]
    ticks: list[datetime] = []

    def sleep(seconds: float) -> None:
        clock[0] += timedelta(seconds=seconds)

    def run() -> bool:
        ticks.append(clock[0])
        if len(ticks) == 2:
            raise RuntimeError("a crashed tick does not end the loop")
        return True

    count = loop(timedelta(minutes=150), clock=lambda: clock[0], sleep=sleep, run=run)
    assert count == len(ticks) == 3
    assert ticks == [at(9, 0), at(10, 0), at(11, 0)]

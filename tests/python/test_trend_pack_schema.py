import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_validate_2024():
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts" / "validate_trend_pack.py"),
            str(ROOT / "data" / "trend-packs" / "trend-pack-2024.yaml"),
        ],
        check=True,
    )


def test_validate_2025():
    subprocess.run(
        [
            sys.executable,
            str(ROOT / "scripts" / "validate_trend_pack.py"),
            str(ROOT / "data" / "trend-packs" / "trend-pack-2025.yaml"),
        ],
        check=True,
    )

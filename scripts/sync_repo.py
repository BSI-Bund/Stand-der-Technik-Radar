"""Synchronize only the public BSI Stand-der-Technik-Bibliothek checkout."""

from __future__ import annotations

import argparse
import subprocess

from _common import ROOT

REPO_URL = "https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek.git"
REPO_ROOT = ROOT / "data/source/oscal/repo"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--revision", help="Öffentliche Commit-ID für einen nachvollziehbaren Datenstand"
    )
    args = parser.parse_args()
    REPO_ROOT.parent.mkdir(parents=True, exist_ok=True)
    if REPO_ROOT.exists():
        if not (REPO_ROOT / ".git").exists():
            raise RuntimeError(
                f"Zielverzeichnis ist kein Git-Checkout; es wird nicht überschrieben: {REPO_ROOT}"
            )
        remote = subprocess.run(
            ["git", "-C", str(REPO_ROOT), "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        if remote.rstrip("/").removesuffix(".git") != REPO_URL.removesuffix(".git"):
            raise RuntimeError(f"Unerwartetes Git-Remote im Radar-Quellordner: {remote}")
        subprocess.run(["git", "-C", str(REPO_ROOT), "fetch", "origin", "main"], check=True)
        subprocess.run(["git", "-C", str(REPO_ROOT), "checkout", "main"], check=True)
        subprocess.run(
            ["git", "-C", str(REPO_ROOT), "merge", "--ff-only", "origin/main"], check=True
        )
    else:
        subprocess.run(
            ["git", "clone", "--depth", "1", "--branch", "main", REPO_URL, str(REPO_ROOT)],
            check=True,
        )
    if args.revision:
        subprocess.run(["git", "-C", str(REPO_ROOT), "fetch", "origin", args.revision], check=True)
        subprocess.run(
            ["git", "-C", str(REPO_ROOT), "checkout", "--detach", args.revision], check=True
        )
    print(f"Öffentliches Repository synchronisiert: {REPO_ROOT}")


if __name__ == "__main__":
    main()

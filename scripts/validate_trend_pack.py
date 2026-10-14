from __future__ import annotations

import argparse
from pathlib import Path

from _common import ROOT, load_json, load_yaml
from jsonschema import Draft202012Validator


def validate_pack(pack_path: Path) -> None:
    schema = load_json(ROOT / "schemas" / "trend_pack.schema.json")
    pack = load_yaml(pack_path)
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(pack), key=lambda e: e.path)
    if errors:
        for error in errors:
            print(f"[SCHEMA] {'.'.join(str(p) for p in error.path)}: {error.message}")
        raise SystemExit(1)
    cluster_ids = {cluster["id"] for cluster in pack["clusters"]}
    for theme in pack["themes"]:
        if theme["cluster_id"] not in cluster_ids:
            raise SystemExit(
                f"Theme {theme['id']} referenziert unbekannten Cluster {theme['cluster_id']}"
            )
        facets = theme.get("facets", [])
        if not (3 <= len(facets) <= 6):
            raise SystemExit(f"Theme {theme['id']} muss 3 bis 6 Facets haben")
    print(f"OK: {pack_path.name}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pack", type=Path)
    args = parser.parse_args()
    validate_pack(args.pack)

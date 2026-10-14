from __future__ import annotations

import argparse

import yaml
from _common import ROOT

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True, type=int)
    args = parser.parse_args()
    target = ROOT / "data" / "trend-packs" / f"trend-pack-{args.year}.yaml"
    if target.exists():
        raise SystemExit(f"{target} existiert bereits.")
    target.write_text(
        yaml.safe_dump(
            {
                "schema_version": "1.0.0",
                "year": args.year,
                "label": f"BSI Trendanalyse {args.year}",
                "status": "draft",
                "source": {
                    "type": "pdf",
                    "title": f"BSI Trendanalyse {args.year}",
                    "file": f"data/source/trends/{args.year}/raw/trendanalyse_{args.year}.pdf",
                    "extracted_from": f"data/source/trends/{args.year}/extracted/trendanalyse_{args.year}.summary.json",
                },
                "display": {
                    "theme_color": "#5B8DEF",
                    "sort_order": args.year,
                    "enabled": False,
                    "grouping_mode": "ui_focus_groups",
                },
                "clusters": [],
                "themes": [],
            },
            sort_keys=False,
            allow_unicode=True,
        ),
        encoding="utf-8",
    )
    print(f"Erstellt: {target}")

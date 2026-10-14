"""Reproducible public-repository radar build; trend scoring itself is unchanged."""

from __future__ import annotations

import argparse
import datetime as dt
import subprocess
import sys
from pathlib import Path

from _common import ROOT, dump_json, load_json, load_yaml
from oscal_items import DEFAULT_REPO_ROOT
from public_data import public_aggregate
from validate_trend_pack import validate_pack


def enabled_years() -> tuple[int, ...]:
    return tuple(
        sorted(
            int(load_yaml(path)["year"])
            for path in (ROOT / "data/trend-packs").glob("trend-pack-*.yaml")
            if load_yaml(path).get("display", {}).get("enabled", True)
        )
    )


def run_python(script: str, *args: str) -> None:
    subprocess.run([sys.executable, str(ROOT / "scripts" / script), *args], check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Stand-der-Technik-Radar erstellen")
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=DEFAULT_REPO_ROOT,
        help="lokaler Checkout der öffentlichen Bibliothek",
    )
    parser.add_argument(
        "--extra-catalog",
        type=Path,
        action="append",
        default=[],
        help="zusätzlicher OSCAL Catalog; mehrfach möglich",
    )
    parser.add_argument(
        "--publish-extra-catalogs",
        action="store_true",
        help="Zusatzkataloge ausdrücklich für die öffentliche Datenprojektion freigeben",
    )
    args = parser.parse_args()
    if args.extra_catalog and not args.publish_extra_catalogs:
        parser.error(
            "Zusatzkataloge benötigen eine ausdrückliche Freigabe mit --publish-extra-catalogs"
        )
    years = enabled_years()
    if not years:
        parser.error("Kein aktiviertes Trend-Pack gefunden")
    repo = args.repo_root.resolve()
    catalog_root = repo / "control_layer"
    component_root = repo / "implementation_layer"
    if not catalog_root.is_dir() or not component_root.is_dir():
        parser.error(
            "Repository benötigt control_layer und implementation_layer; zuerst scripts/sync_repo.py ausführen"
        )
    extras = [path.resolve() for path in args.extra_catalog]
    extra_args = [arg for path in extras for arg in ("--extra-catalog", str(path))]

    # Fail before mutating generated data when a supplied Catalog or taxonomy path is invalid.
    from build_taxonomy_map import build

    taxonomy_output = build(repo, [])

    for year in years:
        validate_pack(ROOT / "data/trend-packs" / f"trend-pack-{year}.yaml")

    for year in years:
        run_python(
            "map_trends.py",
            "--year",
            str(year),
            "--catalog-root",
            str(catalog_root),
            "--component-root",
            str(component_root),
            *extra_args,
        )
        run_python("aggregate_ui.py", "--year", str(year))
        dump_json(
            ROOT / "data/build" / f"trend-pack-{year}.json",
            load_yaml(ROOT / "data/trend-packs" / f"trend-pack-{year}.yaml"),
        )

    manifest = {
        "schema_version": "1.0.0",
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "available_years": [
            {
                "year": year,
                "label": f"Trendanalyse {year}",
                "enabled": True,
                "trend_pack": f"generated/trend-pack-{year}.json",
                "aggregates": f"generated/trend-aggregates-{year}.json",
            }
            for year in years
        ],
    }
    dump_json(ROOT / "data/build/ui-manifest.json", manifest)
    dump_json(ROOT / "data/build/taxonomy-map.json", taxonomy_output)
    public = ROOT / "public/generated"
    public.mkdir(parents=True, exist_ok=True)
    # Apply only the configured radar overlay; trend generation keeps its own explicit inputs.
    from build_supplements import publish

    combined = publish(taxonomy_output)
    dump_json(public / "ui-manifest.json", manifest)
    for year in years:
        dump_json(
            public / f"trend-pack-{year}.json",
            load_yaml(ROOT / "data/trend-packs" / f"trend-pack-{year}.yaml"),
        )
        dump_json(
            public / f"trend-aggregates-{year}.json",
            public_aggregate(load_json(ROOT / "data/build" / f"trend-aggregates-{year}.json")),
        )
    print(
        f"Radar erstellt: {combined['stats']['mapped_total']} Taxonomie-Vorkommen; Trendmapping für {years}."
    )


if __name__ == "__main__":
    main()

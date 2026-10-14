"""Build the optional radar overlay and matching fallback without touching trends."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from _common import ROOT, dump_json, load_json
from build_taxonomy_map import TAXONOMY, build_views, public_view, scan, taxonomy_entries


def import_kernel(path: Path) -> None:
    """Keep only the explicitly approved radar projection, not the full OSCAL document."""
    with TemporaryDirectory() as temporary:
        repo = Path(temporary)
        (repo / "control_layer").mkdir()
        (repo / "implementation_layer").mkdir()
        mappings, _, stats = scan(repo, [path.resolve()], taxonomy_entries(TAXONOMY))
    if len(stats["sources"]) != 1 or not mappings:
        raise ValueError("Zusatzkatalog enthält keine gültigen Zuordnungen")
    source = stats["sources"][0]
    dump_json(
        ROOT / "data/supplements/kernel-g0.json",
        {
            "id": "kernel-g0",
            "title": source["title"],
            "source_path": source["path"],
            "source_sha256": source["sha256"],
            "mappings": mappings,
        },
    )


def combine(base: dict, catalogs: list[dict], taxonomy: list[dict]) -> dict:
    replaced = {path for catalog in catalogs for path in catalog["replaces"]}
    mappings = [
        mapping
        for mapping in base["mappings"]
        if mapping["source_origin"] == "public" and mapping["source_path"] not in replaced
    ] + [mapping for catalog in catalogs for mapping in catalog["mappings"]]
    if len({item["mapping_key"] for item in mappings}) != len(mappings):
        raise ValueError("Doppelte Zuordnung im kombinierten Radar")
    views = build_views(taxonomy, mappings)
    return {
        "schema_version": "2.0.0",
        "generated_at": base["generated_at"],
        "stats": {
            "mapped_total": len(mappings),
            "mapped_controls": sum(item["item_type"] == "control" for item in mappings),
            "mapped_components": sum(item["item_type"] == "component" for item in mappings),
        },
        "hierarchy": views["overview"],
        "views": views,
        "mappings": mappings,
    }


def publish(base: dict | None = None) -> dict:
    config = load_json(ROOT / "data/configs/radar-supplements.json")
    catalogs = []
    for entry in config["catalogs"]:
        if not entry["enabled"]:
            continue
        filename = entry["file"]
        if Path(filename).name != filename or not filename.endswith(".json"):
            raise ValueError("Ungültiger Zusatzkatalogpfad")
        catalog = load_json(ROOT / "data/supplements" / filename)
        if catalog["id"] != entry["id"]:
            raise ValueError("Zusatzkatalog-ID passt nicht zur Konfiguration")
        catalogs.append({**catalog, "replaces": entry["replaces"]})
    report_path = ROOT / "data/build/public-taxonomy-map.json"
    report = None
    if base is not None:
        if "sources" in base.get("stats", {}):
            report = base
            dump_json(report_path, report)
        base = public_view(base)
        if any(item["source_origin"] != "public" for item in base["mappings"]):
            raise ValueError("Der öffentliche Basisstand darf keine Zusatzkataloge enthalten")
        dump_json(ROOT / "data/snapshots/public-radar.json", base)
    else:
        base = load_json(ROOT / "data/snapshots/public-radar.json")
    combined = combine(base, catalogs, taxonomy_entries(TAXONOMY))
    if report is None and report_path.exists():
        report = load_json(report_path)
    if report is not None:
        replaced = {path for catalog in catalogs for path in catalog["replaces"]}
        sources = [
            source for source in report["stats"]["sources"] if source["path"] not in replaced
        ]
        sources += [
            {
                "path": catalog["source_path"],
                "origin": "manual",
                "title": catalog["title"],
                "item_type": "control",
                "sha256": catalog["source_sha256"],
                "objects": len(catalog["mappings"]),
                "mapped": len(catalog["mappings"]),
                "without_taxonomy": 0,
            }
            for catalog in catalogs
        ]
        stats = {
            **report["stats"],
            **combined["stats"],
            "sources": sources,
            "unique_items": len(
                {(item["item_type"], item["identity"]) for item in combined["mappings"]}
            ),
            "skipped_files": [
                *report["stats"].get("skipped_files", []),
                *[
                    {"path": source["path"], "reason": "replaced_by_manual_catalog"}
                    for source in report["stats"]["sources"]
                    if source["path"] in replaced
                ],
            ],
        }
        for kind, plural in [("control", "controls"), ("component", "components")]:
            stats[f"{plural}_extracted"] = sum(
                source["objects"] for source in sources if source["item_type"] == kind
            )
            stats[f"{plural}_without_taxonomy"] = sum(
                source["without_taxonomy"] for source in sources if source["item_type"] == kind
            )
        dump_json(ROOT / "data/build/taxonomy-map.json", {**report, **combined, "stats": stats})
    public = ROOT / "public/generated"
    dump_json(
        public / "supplemental-catalogs.json", {"schema_version": "1.0.0", "catalogs": catalogs}
    )
    dump_json(public / "taxonomy-map.json", combined)
    provenance_path = ROOT / "docs/data-snapshot.json"
    if provenance_path.exists():
        provenance = load_json(provenance_path)
        provenance["radar"]["supplemental_catalogs"] = [
            {"id": item["id"], "source_sha256": item["source_sha256"]} for item in catalogs
        ]
        provenance["radar"]["historical_extra_catalog_included"] = bool(catalogs)
        for filename in ["taxonomy-map.json", "supplemental-catalogs.json"]:
            provenance["files"][filename] = hashlib.sha256(
                (public / filename).read_bytes()
            ).hexdigest()
        dump_json(provenance_path, provenance)
    return combined


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--kernel-catalog", type=Path, help="Kernel-Projektion aus freigegebenem OSCAL neu erzeugen"
    )
    parser.add_argument(
        "--public-snapshot", type=Path, help="neuen rein öffentlichen Basisstand übernehmen"
    )
    parser.add_argument(
        "--disable-kernel",
        action="store_true",
        help="Kernel deaktivieren und Rückfallstand neu erzeugen",
    )
    args = parser.parse_args()
    if args.kernel_catalog:
        import_kernel(args.kernel_catalog)
    if args.disable_kernel:
        path = ROOT / "data/configs/radar-supplements.json"
        config = load_json(path)
        for item in config["catalogs"]:
            if item["id"] == "kernel-g0":
                item["enabled"] = False
        dump_json(path, config)
    result = publish(load_json(args.public_snapshot) if args.public_snapshot else None)
    print(json.dumps(result["stats"], ensure_ascii=False))


if __name__ == "__main__":
    main()

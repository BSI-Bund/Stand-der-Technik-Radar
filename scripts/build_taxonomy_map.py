"""Build the radar from explicit OSCAL Taxonomy-L1..L4 properties only."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from _common import ROOT, dump_json, load_json
from oscal_items import (
    DEFAULT_REPO_ROOT,
    iter_controls,
    prop_value,
    read_document,
    replaced_public_catalogs,
    same_catalog,
)

TAXONOMY = ROOT / "data/source/taxonomy/stand-der-technik.json"
LEVELS = tuple(f"Taxonomy-L{level}" for level in range(1, 5))
PUBLIC_URL = "https://github.com/BSI-Bund/Stand-der-Technik-Bibliothek"
PALETTE = ("#265DFF", "#0E8F8E", "#7654C8", "#B86500", "#BB3241", "#4262A6")


def slug(*parts: str) -> str:
    return hashlib.sha1("\x1f".join(parts).encode("utf-8")).hexdigest()[:14]


def taxonomy_entries(path: Path) -> list[dict[str, str]]:
    raw = load_json(path)
    entries = raw.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError(f"Taxonomie enthält keine Einträge: {path}")
    result = []
    seen = set()
    for entry in entries:
        values = tuple(str(entry.get(level) or "").strip() for level in LEVELS)
        if not all(values) or values in seen:
            raise ValueError(f"Leerer oder doppelter Taxonomiepfad: {values}")
        seen.add(values)
        result.append({**dict(zip(LEVELS, values)), "details": str(entry.get("details") or "")})
    return result


def property_path(props: Any) -> tuple[tuple[str, ...] | None, str | None]:
    found: dict[str, list[str]] = defaultdict(list)
    for prop in props or []:
        if isinstance(prop, dict) and prop.get("name") in LEVELS:
            found[prop["name"]].append(str(prop.get("value") or "").strip())
    if not found:
        return None, "no_taxonomy_properties"
    if any(len(found[level]) != 1 or not found[level][0] for level in LEVELS):
        return None, "incomplete_or_duplicate_taxonomy_properties"
    return tuple(found[level][0] for level in LEVELS), None


def source_files(repo_root: Path, extra_catalogs: list[Path]):
    if (
        not (repo_root / "control_layer").is_dir()
        or not (repo_root / "implementation_layer").is_dir()
    ):
        raise FileNotFoundError(
            f"Öffentliches Repository mit control_layer und implementation_layer fehlt: {repo_root}"
        )
    for path in sorted((repo_root / "control_layer").rglob("*.json")):
        yield path, "public", "control"
    for path in sorted((repo_root / "implementation_layer").rglob("*.json")):
        yield path, "public", "component"
    for index, path in enumerate(extra_catalogs, 1):
        if not path.is_file():
            raise FileNotFoundError(f"Zusatzkatalog fehlt: {path}")
        yield path, "manual", f"control:{index}"


def scan(
    repo_root: Path, extra_catalogs: list[Path], taxonomy: list[dict[str, str]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    valid = {tuple(row[level] for level in LEVELS): row for row in taxonomy}
    docs: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    for path, origin, expected in source_files(repo_root, extra_catalogs):
        if origin == "public" and {
            part.casefold() for part in path.relative_to(repo_root).parts
        } & {"archiv", "beispiel"}:
            continue
        raw = read_document(path)
        if raw is None:
            if origin == "manual":
                raise ValueError(f"Zusatzkatalog ist kein gültiges JSON: {path}")
            skipped.append({"path": str(path.relative_to(repo_root)), "reason": "invalid_json"})
            continue
        kind = (
            "control"
            if isinstance(raw.get("catalog"), dict)
            else "component"
            if isinstance(raw.get("component-definition"), dict)
            else None
        )
        if kind is None:
            if origin == "manual":
                raise ValueError(f"Zusatzdatei ist kein OSCAL Catalog: {path}")
            continue
        if kind != expected.split(":")[0]:
            if origin == "manual":
                raise ValueError(f"Zusatzdatei ist kein OSCAL Catalog: {path}")
            continue
        body = raw["catalog" if kind == "control" else "component-definition"]
        relpath = (
            str(path.relative_to(repo_root))
            if origin == "public"
            else f"Zusatzkatalog/{expected.split(':')[1]}-{path.name}"
        )
        objects = list(iter_controls(body)) if kind == "control" else body.get("components") or []
        docs.append(
            {
                "body": body,
                "objects": objects,
                "kind": kind,
                "origin": origin,
                "path": relpath,
                "file": path,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "title": str((body.get("metadata") or {}).get("title") or path.stem),
            }
        )

    # A manually supplied, modified copy of the same Catalog supersedes its public version.
    manuals = [doc for doc in docs if doc["origin"] == "manual"]
    for index, left in enumerate(manuals):
        if any(same_catalog(left["body"], right["body"]) for right in manuals[index + 1 :]):
            raise ValueError(
                "Zwei Zusatzkataloge repräsentieren denselben Katalog; bitte nur eine Version angeben"
            )
    replaced = replaced_public_catalogs(
        [
            (doc["file"], doc["body"], doc["origin"] == "manual")
            for doc in docs
            if doc["kind"] == "control"
        ]
    )
    effective = []
    for doc in docs:
        if doc["origin"] == "public" and doc["file"] in replaced:
            skipped.append({"path": doc["path"], "reason": "replaced_by_manual_catalog"})
        else:
            effective.append(doc)
    commit = subprocess.run(
        ["git", "-C", str(repo_root), "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
        check=False,
    )
    revision = commit.stdout.strip() if commit.returncode == 0 else "main"
    mappings = []
    extracted = Counter()
    missing = Counter()
    for doc in effective:
        kind = doc["kind"]
        extracted[kind] += len(doc["objects"])
        doc["mapped"] = 0
        doc["without_taxonomy"] = 0
        for index, obj in enumerate(doc["objects"]):
            path_values, reason = property_path(obj.get("props"))
            if reason == "no_taxonomy_properties":
                missing[kind] += 1
                doc["without_taxonomy"] += 1
                continue
            identifier = str(obj.get("id") or obj.get("uuid") or f"position-{index}")
            if reason or path_values not in valid:
                issues.append(
                    {
                        "source_path": doc["path"],
                        "item_type": kind,
                        "id": identifier,
                        "reason": reason or "unknown_taxonomy_path",
                        "values": dict(zip(LEVELS, path_values or [])),
                    }
                )
                continue
            leaf_id = f"leaf:{slug(*path_values)}"
            tax = {
                "leaf_id": leaf_id,
                "level1": path_values[0],
                "level2": path_values[1],
                "product_category": path_values[2],
                "product_group": path_values[3],
                "level3": path_values[3],
            }
            key = f"{kind}:{slug(doc['path'], identifier, str(index))}"
            identity = str(
                prop_value(obj.get("props"), "alt-identifier")
                or obj.get("uuid")
                or f"{doc['body'].get('uuid') or doc['path']}:{identifier}"
            )
            mappings.append(
                {
                    "mapping_key": key,
                    "item_type": kind,
                    "id": identifier,
                    "identity": identity,
                    "title": str(obj.get("title") or identifier),
                    "uuid": str(obj.get("uuid") or ""),
                    "source_title": doc["title"],
                    "source_uuid": str(doc["body"].get("uuid") or ""),
                    "source_path": doc["path"],
                    "source_origin": doc["origin"],
                    "source_url": f"{PUBLIC_URL}/blob/{revision}/{doc['path']}"
                    if doc["origin"] == "public"
                    else None,
                    "taxonomy": tax,
                }
            )
            doc["mapped"] += 1
    if issues:
        sample = "\n".join(
            f"{issue['source_path']} · {issue['id']}: {issue['reason']}" for issue in issues[:20]
        )
        raise ValueError(
            f"{len(issues)} ungültige Taxonomie-Zuordnungen. Build abgebrochen:\n{sample}"
        )
    sources = [
        {
            "path": doc["path"],
            "origin": doc["origin"],
            "title": doc["title"],
            "item_type": doc["kind"],
            "sha256": doc["sha256"],
            "objects": len(doc["objects"]),
            "mapped": doc["mapped"],
            "without_taxonomy": doc["without_taxonomy"],
        }
        for doc in effective
    ]
    stats = {
        "controls_extracted": extracted["control"],
        "components_extracted": extracted["component"],
        "controls_without_taxonomy": missing["control"],
        "components_without_taxonomy": missing["component"],
        "skipped_files": skipped,
        "sources": sources,
        "repository_revision": revision,
    }
    return mappings, issues, stats


def counts_and_ids(mappings: list[dict[str, Any]]):
    counts: dict[str, Counter] = defaultdict(Counter)
    ids: dict[str, list[str]] = defaultdict(list)
    for mapping in mappings:
        t = mapping["taxonomy"]
        l1, l2, l3 = t["level1"], t["level2"], t["product_category"]
        keys = (
            "root",
            f"function:{slug(l1)}",
            f"function-domain:{slug(l1, l2)}",
            f"function-domain-category:{slug(l1, l2, l3)}",
            f"domain:{slug(l2)}",
            f"domain-category:{slug(l2, l3)}",
            t["leaf_id"],
        )
        for key in keys:
            counts[key]["controls" if mapping["item_type"] == "control" else "components"] += 1
            ids[key].append(mapping["mapping_key"])
    return counts, ids


def build_views(taxonomy: list[dict[str, str]], mappings: list[dict[str, Any]]) -> dict[str, Any]:
    counts, ids = counts_and_ids(mappings)

    def node(
        key: str, label: str, level: int, kind: str, color: str | None = None, details: str = ""
    ) -> dict[str, Any]:
        c = counts[key]
        result = {
            "id": key,
            "label": label,
            "level": level,
            "kind": kind,
            "counts": {
                "controls": c["controls"],
                "components": c["components"],
                "total": c["controls"] + c["components"],
            },
            "mapping_ids": ids[key],
            "children": [],
        }
        if color:
            result["color"] = color
        if details:
            result["details"] = details
        return result

    overview = node("root", "SdT Taxonomie", 0, "overview")
    functions: dict[str, dict[str, Any]] = {}
    domains: dict[str, dict[str, Any]] = {}
    overview_l1: dict[str, dict[str, Any]] = {}
    overview_l2: set[str] = set()
    function_l2: dict[str, dict[str, Any]] = {}
    function_l3: dict[str, dict[str, Any]] = {}
    domain_l3: dict[str, dict[str, Any]] = {}
    for row in taxonomy:
        l1, l2, l3, l4 = (row[level] for level in LEVELS)
        fkey, fdkey, fckey = (
            f"function:{slug(l1)}",
            f"function-domain:{slug(l1, l2)}",
            f"function-domain-category:{slug(l1, l2, l3)}",
        )
        dkey, dckey, leafkey = (
            f"domain:{slug(l2)}",
            f"domain-category:{slug(l2, l3)}",
            f"leaf:{slug(l1, l2, l3, l4)}",
        )
        if fkey not in overview_l1:
            color = PALETTE[len(overview_l1) % len(PALETTE)]
            overview_l1[fkey] = node(fkey, l1, 1, "function", color)
            overview_l1[fkey]["view_ref"] = fkey
            overview["children"].append(overview_l1[fkey])
            functions[fkey] = node(fkey, l1, 0, "function")
        color = overview_l1[fkey]["color"]
        if fdkey not in overview_l2:
            overview_l2.add(fdkey)
            child = node(fdkey, l2, 2, "technology_domain", color)
            child["view_ref"] = dkey
            child["display_weight"] = max(0.36, child["counts"]["total"])
            overview_l1[fkey]["children"].append(child)
            function_l2[fdkey] = node(fdkey, l2, 1, "technology_domain", color)
            functions[fkey]["children"].append(function_l2[fdkey])
        if fckey not in function_l3:
            function_l3[fckey] = node(fckey, l3, 2, "product_category", color)
            function_l2[fdkey]["children"].append(function_l3[fckey])
        function_l3[fckey]["children"].append(
            node(leafkey, l4, 3, "product_group", color, row["details"])
        )
        if dkey not in domains:
            domains[dkey] = node(dkey, l2, 0, "technology_domain")
        if dckey not in domain_l3:
            category_color = PALETTE[len(domains[dkey]["children"]) % len(PALETTE)]
            domain_l3[dckey] = node(dckey, l3, 1, "product_category", category_color)
            domains[dkey]["children"].append(domain_l3[dckey])
        domain_l3[dckey]["children"].append(
            node(leafkey, l4, 2, "product_group", domain_l3[dckey]["color"], row["details"])
        )
    return {"overview": overview, "functions": functions, "domains": domains}


def build(
    repo_root: Path, extra_catalogs: list[Path], taxonomy_path: Path = TAXONOMY
) -> dict[str, Any]:
    taxonomy = taxonomy_entries(taxonomy_path)
    mappings, issues, scan_stats = scan(repo_root, extra_catalogs, taxonomy)
    views = build_views(taxonomy, mappings)
    identities = {(m["item_type"], m["identity"]) for m in mappings}
    return {
        "schema_version": "2.0.0",
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "taxonomy_source": "data/source/taxonomy/stand-der-technik.json",
        "source_roots": {"repository": PUBLIC_URL, "revision": scan_stats["repository_revision"]},
        "stats": {
            "taxonomy_leaf_count": len(taxonomy),
            "controls_extracted": scan_stats["controls_extracted"],
            "components_extracted": scan_stats["components_extracted"],
            "mapped_total": len(mappings),
            "mapped_controls": sum(m["item_type"] == "control" for m in mappings),
            "mapped_components": sum(m["item_type"] == "component" for m in mappings),
            "unique_items": len(identities),
            "controls_without_taxonomy": scan_stats["controls_without_taxonomy"],
            "components_without_taxonomy": scan_stats["components_without_taxonomy"],
            "invalid_taxonomy": len(issues),
            "mapping_policy": "explicit_oscal_taxonomy_properties_only",
            "skipped_files": scan_stats["skipped_files"],
            "sources": scan_stats["sources"],
        },
        "hierarchy": views["overview"],
        "views": views,
        "mappings": mappings,
    }


def public_view(output: dict[str, Any]) -> dict[str, Any]:
    """Keep import diagnostics in data/build, never in the published radar data."""
    return {
        "schema_version": output["schema_version"],
        "generated_at": output["generated_at"],
        "stats": {
            key: output["stats"][key]
            for key in ("mapped_total", "mapped_controls", "mapped_components")
        },
        "hierarchy": output["hierarchy"],
        "views": output["views"],
        "mappings": output["mappings"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Radar aus öffentlichem OSCAL-Repository und optionalen Zusatzkatalogen bauen"
    )
    parser.add_argument("--repo-root", type=Path, default=DEFAULT_REPO_ROOT)
    parser.add_argument("--taxonomy", type=Path, default=TAXONOMY)
    parser.add_argument("--extra-catalog", type=Path, action="append", default=[])
    parser.add_argument("--publish-extra-catalogs", action="store_true")
    args = parser.parse_args()
    if args.extra_catalog:
        parser.error(
            "Radar-Zusatzkataloge mit scripts/build_supplements.py --kernel-catalog pflegen"
        )
    output = build(args.repo_root, args.extra_catalog, args.taxonomy)
    target = ROOT / "data/build/taxonomy-map.json"
    dump_json(target, output)
    public = ROOT / "public/generated/taxonomy-map.json"
    public.parent.mkdir(parents=True, exist_ok=True)
    from build_supplements import publish

    combined = publish(output)
    print(
        f"Radar: {combined['stats']['mapped_total']} belegte Vorkommen einschließlich aktivierter Zusatzkataloge."
    )


if __name__ == "__main__":
    main()

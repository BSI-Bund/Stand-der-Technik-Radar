from __future__ import annotations

import argparse
import datetime as dt
import hashlib
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from _common import ROOT, dump_json, load_json, load_yaml


def file_sha256(path: Path) -> str | None:
    if not path.exists():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def label_for_score(score: float | None) -> str:
    if score is None:
        return "nicht berechnet"
    if score < 0.2:
        return "nicht abgedeckt"
    if score < 0.4:
        return "punktuell"
    if score < 0.6:
        return "teilweise"
    if score < 0.8:
        return "substanziell"
    return "stark"


def pct(score: float | None) -> int | None:
    return None if score is None else int(round(score * 100))


def compute_radar(
    theme: dict[str, Any], theme_matches: list[dict[str, Any]]
) -> dict[str, float] | None:
    if not theme_matches:
        return None
    weighted_sum = sum(item["final_score"] for item in theme_matches)
    presence = min(1.0, weighted_sum / 8.0)
    facets = theme.get("facets", [])
    facet_support = {facet["id"]: 0.0 for facet in facets}
    strong_count = 0
    for match in theme_matches:
        if match["strength"] == "strong":
            strong_count += 1
        for facet in match.get("matched_facets", []):
            facet_support[facet["facet_id"]] = max(
                facet_support.get(facet["facet_id"], 0.0), facet.get("score", 0.0)
            )
    covered = [score for score in facet_support.values() if score >= 0.5]
    breadth = len(covered) / max(1, len(facets))
    avg_facet_depth = sum(facet_support.values()) / max(1, len(facets))
    strong_bonus = min(1.0, strong_count / max(1, (len(facets) + 1) // 2))
    depth = min(1.0, 0.6 * avg_facet_depth + 0.4 * strong_bonus)
    coverage = min(1.0, 0.24 * presence + 0.38 * depth + 0.38 * breadth)
    return {
        "presence": round(presence, 4),
        "depth": round(depth, 4),
        "breadth": round(breadth, 4),
        "coverage": round(coverage, 4),
    }


def item_summary(entry: dict[str, Any], match: dict[str, Any]) -> dict[str, Any]:
    summary = {
        "item_type": entry.get("item_type", "control"),
        "item_id": entry.get("item_id")
        or entry.get("requirement_id")
        or entry.get("component_id")
        or entry.get("id"),
        "id": entry.get("id") or entry.get("requirement_id") or entry.get("component_id") or "",
        "title": entry.get("title", ""),
        "uuid": entry.get("uuid", ""),
        "source_title": entry.get("source_title", ""),
        "source_uuid": entry.get("source_uuid", ""),
        "source_path": entry.get("source_path", ""),
        "score": match.get("final_score"),
        "strength": match.get("strength"),
        "evidence": match.get("evidence", {}),
    }
    if summary["item_type"] == "control":
        summary["requirement_id"] = entry.get("requirement_id") or summary["id"]
    else:
        summary["component_id"] = entry.get("component_id") or summary["id"]
    return summary


def build_aggregate(year: int) -> dict[str, Any]:
    pack_path = ROOT / "data" / "trend-packs" / f"trend-pack-{year}.yaml"
    mapping_path = ROOT / "data" / "mappings" / f"mappings-{year}.scored.json"
    pack = load_yaml(pack_path)
    mappings = load_json(mapping_path) if mapping_path.exists() else {"mappings": []}
    themes = pack["themes"]
    clusters = {cluster["id"]: cluster for cluster in pack["clusters"]}

    matches_by_theme: dict[str, list[dict[str, Any]]] = defaultdict(list)
    items_by_theme: dict[str, list[dict[str, Any]]] = defaultdict(list)
    keyword_counter_by_theme: dict[str, Counter[str]] = defaultdict(Counter)
    source_counter_by_theme: dict[str, Counter[str]] = defaultdict(Counter)

    for entry in mappings.get("mappings", []):
        for match in entry.get("matches", []):
            theme_id = match["trend_theme_id"]
            matches_by_theme[theme_id].append(match)
            items_by_theme[theme_id].append(item_summary(entry, match))
            for keyword in match.get("evidence", {}).get("keywords_hit", []):
                keyword_counter_by_theme[theme_id][keyword] += 1
            source_counter_by_theme[theme_id][entry.get("source_title", "")] += 1

    themes_out = []
    cluster_theme_counts: dict[str, int] = defaultdict(int)
    cluster_coverage_values: dict[str, list[float]] = defaultdict(list)

    for theme in themes:
        theme_id = theme["id"]
        theme_matches = matches_by_theme.get(theme_id, [])
        theme_items = sorted(
            items_by_theme.get(theme_id, []),
            key=lambda item: (item.get("score") or 0, item.get("title") or ""),
            reverse=True,
        )
        radar = compute_radar(theme, theme_matches)
        strengths = Counter(match["strength"] for match in theme_matches)
        controls = [item for item in theme_items if item["item_type"] == "control"]
        components = [item for item in theme_items if item["item_type"] == "component"]
        counts = {
            "items_total": len(theme_items),
            "controls_total": len(controls),
            "components_total": len(components),
            "requirements_total": len(theme_items),
            "requirements_strong": strengths.get("strong", 0),
            "requirements_medium": strengths.get("medium", 0),
            "requirements_weak": strengths.get("weak", 0),
            "catalog_count": len([key for key in source_counter_by_theme[theme_id] if key]),
            "target_object_count": 0,
            "tag_count": len(keyword_counter_by_theme[theme_id]),
        }
        cluster_theme_counts[theme["cluster_id"]] += 1
        if radar:
            cluster_coverage_values[theme["cluster_id"]].append(radar["coverage"])
        themes_out.append(
            {
                "trend_theme_id": theme_id,
                "cluster_id": theme["cluster_id"],
                "label": theme["label"],
                "short_label": theme.get("short_label", theme["label"]),
                "management_summary": theme["management_summary"],
                "counts": counts,
                "radar": radar,
                "display": {
                    "presence_pct": pct(radar["presence"]) if radar else None,
                    "depth_pct": pct(radar["depth"]) if radar else None,
                    "breadth_pct": pct(radar["breadth"]) if radar else None,
                    "coverage_pct": pct(radar["coverage"]) if radar else None,
                    "coverage_label": label_for_score(radar["coverage"] if radar else None),
                    "color": theme["color"],
                    "is_placeholder": not bool(theme_matches),
                },
                "top_tags": [item for item, _ in keyword_counter_by_theme[theme_id].most_common(7)],
                "top_target_objects": [
                    item for item, _ in source_counter_by_theme[theme_id].most_common(5) if item
                ],
                "requirements": [
                    {
                        "requirement_id": item.get("requirement_id", item["id"]),
                        "title": item["title"],
                        "uuid": item["uuid"],
                        "score": item.get("score"),
                        "strength": item.get("strength"),
                    }
                    for item in controls
                ],
                "components": [
                    {
                        "component_id": item.get("component_id", item["id"]),
                        "title": item["title"],
                        "uuid": item["uuid"],
                        "score": item.get("score"),
                        "strength": item.get("strength"),
                    }
                    for item in components
                ],
                "items": theme_items,
                "map_position": theme["map_position"],
            }
        )

    clusters_out = []
    for cluster_id, cluster in clusters.items():
        coverage_values = cluster_coverage_values.get(cluster_id, [])
        avg_coverage = (
            round(sum(coverage_values) / len(coverage_values), 4) if coverage_values else None
        )
        clusters_out.append(
            {
                "cluster_id": cluster_id,
                "label": cluster["label"],
                "short_label": cluster.get("short_label", cluster["label"]),
                "description": cluster.get("description", ""),
                "theme_count": cluster_theme_counts.get(cluster_id, 0),
                "avg_coverage": avg_coverage,
                "display": {
                    "avg_coverage_pct": pct(avg_coverage),
                    "coverage_label": label_for_score(avg_coverage),
                    "color": cluster["color"],
                },
                "map_position": cluster["map_position"],
            }
        )

    top_covered = sorted(
        [theme for theme in themes_out if theme["radar"]],
        key=lambda item: item["radar"]["coverage"],
        reverse=True,
    )[:5]
    weakest = sorted(
        [theme for theme in themes_out if theme["radar"]],
        key=lambda item: item["radar"]["coverage"],
    )[:5]
    empty_count = len([theme for theme in themes_out if not theme["radar"]])
    mapped_items = len(mappings.get("mappings", []))
    mapped_controls = len(
        [entry for entry in mappings.get("mappings", []) if entry.get("item_type") == "control"]
    )
    mapped_components = len(
        [entry for entry in mappings.get("mappings", []) if entry.get("item_type") == "component"]
    )

    return {
        "schema_version": "1.1.0",
        "year": year,
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "reproducibility": {
            "trend_pack": str(pack_path.relative_to(ROOT)),
            "mappings": str(mapping_path.relative_to(ROOT)) if mapping_path.exists() else None,
            "trend_pack_sha256": file_sha256(pack_path),
            "mappings_sha256": file_sha256(mapping_path),
        },
        "themes": themes_out,
        "clusters": clusters_out,
        "kpis": [
            {"id": "themes_total", "label": "Trends", "value": len(themes_out)},
            {"id": "clusters_total", "label": "Cluster", "value": len(clusters_out)},
            {"id": "themes_without_mappings", "label": "Ohne Mapping", "value": empty_count},
            {"id": "mapped_items", "label": "Gemappte Inhalte", "value": mapped_items},
            {"id": "mapped_controls", "label": "Controls", "value": mapped_controls},
            {"id": "mapped_components", "label": "Components", "value": mapped_components},
            {
                "id": "mapped_requirements",
                "label": "Anforderungen mit Mapping",
                "value": mapped_items,
            },
        ],
        "highlights": {
            "top_covered": [
                {
                    "id": theme["trend_theme_id"],
                    "label": theme["label"],
                    "coverage_pct": theme["display"]["coverage_pct"],
                }
                for theme in top_covered
            ],
            "weakest": [
                {
                    "id": theme["trend_theme_id"],
                    "label": theme["label"],
                    "coverage_pct": theme["display"]["coverage_pct"],
                }
                for theme in weakest
            ],
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True, type=int)
    args = parser.parse_args()
    data = build_aggregate(args.year)
    dump_json(ROOT / "data" / "build" / f"trend-aggregates-{args.year}.json", data)
    print(f"Aggregat fuer {args.year} erzeugt.")


if __name__ == "__main__":
    main()

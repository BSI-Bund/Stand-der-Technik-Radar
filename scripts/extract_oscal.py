from __future__ import annotations

import argparse
import json
from pathlib import Path

from _common import ROOT, dump_json, normalize_text


def gather_text_from_parts(parts):
    out = []
    for part in parts or []:
        if part.get("prose"):
            out.append(str(part["prose"]))
        out.extend(gather_text_from_parts(part.get("parts") or []))
    return out


def collect_props(props):
    tags, target_objects = [], []
    for prop in props or []:
        name = normalize_text(str(prop.get("name", "")))
        value = str(prop.get("value", "")).strip()
        if ("tag" in name or "topic" in name) and value:
            tags.append(value)
        if ("zielobjekt" in name or "target" in name or "objekt" in name) and value:
            target_objects.append(value)
    return tags, target_objects


def flatten_control(control, catalog_id, catalog_title, out):
    title = control.get("title", "")
    prose_parts = gather_text_from_parts(control.get("parts") or [])
    tags, target_objects = collect_props(control.get("props") or [])
    out.append(
        {
            "requirement_id": control.get("id", ""),
            "catalog_id": catalog_id,
            "catalog_title": catalog_title,
            "title": title,
            "full_text": "\n".join([title] + prose_parts).strip(),
            "tags": sorted(set(tags)),
            "target_objects": sorted(set(target_objects)),
            "relations": control.get("links", []),
            "raw_props": control.get("props", []),
        }
    )
    for nested in control.get("controls", []) or []:
        flatten_control(nested, catalog_id, catalog_title, out)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source", type=Path, default=ROOT / "data" / "source" / "oscal" / "catalogs"
    )
    args = parser.parse_args()
    requirements = []
    for path in sorted(args.source.rglob("*.json")):
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        catalog = raw.get("catalog") or raw.get("component-definition") or raw
        catalog_id = str(catalog.get("uuid") or path.stem)
        catalog_title = str(catalog.get("metadata", {}).get("title") or path.stem)
        for control in catalog.get("controls", []) or []:
            flatten_control(control, catalog_id, catalog_title, requirements)
    dump_json(ROOT / "data" / "normalized" / "requirements.normalized.json", requirements)
    print(f"{len(requirements)} Anforderungen normalisiert.")

"""Shared OSCAL text extraction for the existing trend-mapping engine."""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

DEFAULT_REPO_ROOT = Path(__file__).resolve().parents[1] / "data/source/oscal/repo"
DEFAULT_CATALOG_ROOT = DEFAULT_REPO_ROOT / "control_layer"
DEFAULT_COMPONENT_ROOT = DEFAULT_REPO_ROOT / "implementation_layer"


@dataclass
class LibraryItem:
    item_type: str
    id: str
    title: str
    uuid: str
    source_title: str
    source_uuid: str
    source_path: str
    text: str


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower().replace("ß", "ss")
    return re.sub(r"[^a-z0-9_\-+/& ]+", " ", value).strip()


def text_values(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if isinstance(value, (int, float, bool)):
        return [str(value)]
    if isinstance(value, list):
        return [text for entry in value for text in text_values(entry)]
    if isinstance(value, dict):
        return [
            text
            for key, entry in value.items()
            if key not in {"uuid", "href"}
            for text in text_values(entry)
        ]
    return []


def collect_props(props: list[dict[str, Any]] | None) -> list[str]:
    return [
        text
        for prop in props or []
        for text in (str(prop.get("name") or "").strip(), str(prop.get("value") or "").strip())
        if text
    ]


def collect_parts(parts: list[dict[str, Any]] | None) -> list[str]:
    return [
        text
        for part in parts or []
        for text in [
            str(part.get("name") or ""),
            *collect_props(part.get("props")),
            *text_values(part.get("prose")),
            *collect_parts(part.get("parts")),
        ]
        if text
    ]


def iter_controls(node: dict[str, Any]):
    for control in node.get("controls") or []:
        yield control
        yield from iter_controls(control)
    for group in node.get("groups") or []:
        yield from iter_controls(group)


def prop_value(props: list[dict[str, Any]] | None, name: str) -> str:
    return next(
        (
            str(prop["value"])
            for prop in props or []
            if prop.get("name") == name and prop.get("value")
        ),
        "",
    )


def read_document(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        return data if isinstance(data, dict) else None
    except OSError, UnicodeError, json.JSONDecodeError:
        return None


def same_catalog(left: dict[str, Any], right: dict[str, Any]) -> bool:
    """Identify a manually edited copy without merging unrelated topic Catalogs."""
    if left.get("uuid") and left.get("uuid") == right.get("uuid"):
        return True
    left_title = normalize(str((left.get("metadata") or {}).get("title") or ""))
    right_title = normalize(str((right.get("metadata") or {}).get("title") or ""))
    if not left_title or left_title != right_title:
        return False

    def identities(body: dict[str, Any]) -> set[str]:
        return {
            str(
                prop_value(control.get("props"), "alt-identifier")
                or control.get("uuid")
                or control.get("id")
                or ""
            )
            for control in iter_controls(body)
        } - {""}

    a, b = identities(left), identities(right)
    return bool(a and b and len(a & b) / min(len(a), len(b)) >= 0.8)


def replaced_public_catalogs(candidates: list[tuple[Path, dict[str, Any], bool]]) -> set[Path]:
    """Select one matching public Catalog per manual copy, never every similar variant."""
    public = [(path, body) for path, body, manual in candidates if not manual]
    replaced: set[Path] = set()

    def stem(path: Path) -> str:
        value = path.stem.casefold().replace("_", "-")
        return re.sub(r"(?:-with-taxonomy|-mit-taxonomie|-taxonomisiert)$", "", value)

    for manual_path, manual_body, manual in candidates:
        if not manual:
            continue
        matches = [(path, body) for path, body in public if same_catalog(body, manual_body)]
        if not matches:
            continue
        by_uuid = [
            (path, body)
            for path, body in matches
            if body.get("uuid") and body.get("uuid") == manual_body.get("uuid")
        ]
        by_name = [(path, body) for path, body in matches if stem(path) == stem(manual_path)]
        preferred = by_uuid or by_name or matches
        if len(preferred) == 1:
            replaced.add(preferred[0][0])
            continue
        scored = sorted(
            (
                (SequenceMatcher(None, stem(manual_path), stem(path)).ratio(), path)
                for path, _ in preferred
            ),
            reverse=True,
        )
        if scored[0][0] > scored[1][0] + 0.1:
            replaced.add(scored[0][1])
            continue
        raise ValueError(
            f"Zusatzkatalog {manual_path.name} passt zu mehreren öffentlichen Katalogen; Dateinamen zur eindeutigen Variante angleichen"
        )
    return replaced


def _paths(root: Path, extras: list[Path] | None = None):
    if not root.is_dir():
        raise FileNotFoundError(f"OSCAL-Quellordner fehlt: {root}")
    yield from sorted(root.rglob("*.json"))
    yield from extras or []


def display_path(path: Path, root: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve().parent))
    except ValueError:
        return f"Zusatzkatalog/{path.name}"


def extract_catalog_items(
    root: Path, extras: list[Path] | None = None
) -> tuple[list[LibraryItem], list[dict[str, str]]]:
    items: list[LibraryItem] = []
    skipped: list[dict[str, str]] = []
    candidates = []
    for path in _paths(root, extras):
        if path not in (extras or []) and {
            part.casefold() for part in path.relative_to(root).parts
        } & {"archiv", "beispiel"}:
            continue
        raw = read_document(path)
        catalog = raw.get("catalog") if raw else None
        if not isinstance(catalog, dict):
            continue
        candidates.append((path, catalog, path in (extras or [])))
    replaced = replaced_public_catalogs(candidates)
    for path, catalog, manual in candidates:
        if not manual and path in replaced:
            skipped.append(
                {"path": display_path(path, root), "reason": "replaced_by_manual_catalog"}
            )
            continue
        source_title = str((catalog.get("metadata") or {}).get("title") or path.stem)
        source_uuid = str(catalog.get("uuid") or "")
        controls = list(iter_controls(catalog))
        if not controls:
            skipped.append({"path": display_path(path, root), "reason": "catalog_without_controls"})
        for control in controls:
            item_id = str(control.get("id") or "")
            title = str(control.get("title") or item_id)
            uuid = str(
                control.get("uuid") or prop_value(control.get("props"), "alt-identifier") or ""
            )
            text = " ".join(
                [
                    source_title,
                    item_id,
                    title,
                    str(control.get("class") or ""),
                    " ".join(collect_props(control.get("props"))),
                    " ".join(collect_parts(control.get("parts"))),
                ]
            )
            items.append(
                LibraryItem(
                    "control",
                    item_id,
                    title,
                    uuid,
                    source_title,
                    source_uuid,
                    display_path(path, root),
                    text,
                )
            )
    return items, skipped


def extract_component_items(root: Path) -> tuple[list[LibraryItem], list[dict[str, str]]]:
    items: list[LibraryItem] = []
    skipped: list[dict[str, str]] = []
    for path in _paths(root):
        raw = read_document(path)
        definition = raw.get("component-definition") if raw else None
        if not isinstance(definition, dict):
            continue
        source_title = str((definition.get("metadata") or {}).get("title") or path.parent.name)
        source_uuid = str(definition.get("uuid") or "")
        components = definition.get("components") or []
        if not components:
            skipped.append(
                {
                    "path": display_path(path, root),
                    "reason": "component_definition_without_components",
                }
            )
        for component in components:
            uuid = str(component.get("uuid") or "")
            title = str(component.get("title") or uuid or path.stem)
            item_id = uuid or normalize(title).replace(" ", "-")
            text = " ".join(
                [
                    source_title,
                    title,
                    str(component.get("type") or ""),
                    " ".join(collect_props(component.get("props"))),
                    " ".join(text_values(component.get("description"))),
                    " ".join(text_values(component.get("remarks"))),
                    " ".join(text_values(component.get("control-implementations"))),
                    " ".join(text_values(component.get("responsible-roles"))),
                ]
            )
            items.append(
                LibraryItem(
                    "component",
                    item_id,
                    title,
                    uuid,
                    source_title,
                    source_uuid,
                    display_path(path, root),
                    text,
                )
            )
    return items, skipped

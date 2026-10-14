from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import re
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from _common import ROOT, dump_json, load_yaml
from oscal_items import (
    DEFAULT_CATALOG_ROOT,
    DEFAULT_COMPONENT_ROOT,
    LibraryItem,
    extract_catalog_items,
    extract_component_items,
    normalize,
)
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DEFAULT_ACCEPTANCE_THRESHOLD = 0.60


GENERIC_TERMS = {
    "und",
    "oder",
    "mit",
    "der",
    "die",
    "das",
    "ein",
    "eine",
    "fuer",
    "von",
    "zur",
    "zum",
    "bei",
    "im",
    "in",
    "it",
    "security",
    "sicherheit",
    "management",
    "system",
    "systeme",
    "prozess",
    "prozesse",
    "plattform",
    "plattformen",
    "loesung",
    "loesungen",
}

WEAK_SINGLE_TERMS = {
    "cloud",
    "identitat",
    "identitaet",
    "identitatsmanagement",
    "identity",
    "software",
    "code",
    "security",
    "sicherheit",
    "plattform",
    "plattformen",
    "service",
    "dienst",
    "dienste",
    "management",
    "ressource",
    "ressourcen",
    "betrieb",
    "lebenszyklus",
    "anwendung",
    "anwendungen",
    "zugang",
    "konto",
    "konten",
    "credential",
    "credentials",
    "phishing",
    "resilienz",
    "verifikation",
    "authentisierung",
    "authentifizierung",
}


TREND_ALIASES = {
    "cloud": [
        "cloud dienst",
        "cloud service",
        "iaas",
        "paas",
        "saas",
        "outsourcing",
        "auslagerung",
        "shared responsibility",
        "mandantentrennung",
        "datenlokation",
        "rechtsraum",
    ],
    "zero trust": [
        "least privilege",
        "minimal privilege",
        "kontinuierliche verifikation",
        "segmentierung",
        "zugriffskontrolle",
        "bedingter zugriff",
    ],
    "passwortlos": [
        "passkey",
        "passkeys",
        "fido",
        "webauthn",
        "passwordless",
        "passwortlose authentisierung",
    ],
    "wallet": [
        "eudi",
        "credential",
        "digitale identitaet",
        "mobile id",
        "nachweis",
        "eid",
    ],
    "open source": [
        "sbom",
        "software bill of materials",
        "software supply chain",
        "dependency",
        "dependencies",
        "bibliothek",
        "softwarebibliothek",
    ],
    "softwarequalitaet": [
        "secure coding",
        "security by design",
        "code review",
        "softwaretest",
        "eingabevalidierung",
        "softwareentwicklung",
    ],
    "vibe coding": [
        "codegenerierung",
        "ki generierter code",
        "llm",
        "prompt injection",
        "repository",
        "code review",
    ],
    "mcp": [
        "model context protocol",
        "agentic ai",
        "tool access",
        "werkzeugzugriff",
        "funktionsaufruf",
        "prompt injection",
    ],
    "confidential computing": [
        "trusted execution environment",
        "tee",
        "daten in nutzung",
        "verschluesselung waehrend der verarbeitung",
        "vertrauliche verarbeitung",
    ],
    "spyware": [
        "infostealer",
        "stealer",
        "malware",
        "schadsoftware",
        "exfiltration",
        "datenabfluss",
        "phishing",
    ],
    "kritis": [
        "kritische infrastruktur",
        "kritische infrastrukturen",
        "energie",
        "wasser",
        "versorgung",
        "resilienz",
        "verfuegbarkeit",
    ],
    "fachkraeftemangel": [
        "schulung",
        "awareness",
        "ausbildung",
        "weiterbildung",
        "kompetenz",
        "rollen",
        "ressourcen",
    ],
    "nachhaltigkeit": [
        "ressourcen",
        "energie",
        "effizienz",
        "lebenszyklus",
        "aussonderung",
        "betrieb",
    ],
}


def file_sha256(path: Path) -> str | None:
    if not path.exists():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def item_identifier(item: LibraryItem) -> str:
    return item.id or item.uuid or item.title


def item_text(item: LibraryItem) -> str:
    return " ".join(
        part
        for part in [
            item.source_title,
            item.id,
            item.title,
            item.uuid,
            item.text,
        ]
        if part
    )


def weighted_terms(theme: dict[str, Any]) -> list[tuple[str, float, str]]:
    terms: list[tuple[str, float, str]] = []

    def add_many(values: list[str], weight: float, source: str) -> None:
        for value in values or []:
            value = str(value).strip()
            if value:
                terms.append((value, weight, source))
                norm = normalize(value)
                for alias_key, aliases in TREND_ALIASES.items():
                    if alias_key in norm:
                        terms.extend((alias, weight * 0.85, f"{source}_alias") for alias in aliases)

    add_many([theme.get("label", ""), theme.get("short_label", "")], 1.2, "label")
    add_many(theme.get("aliases", []), 1.1, "alias")
    add_many(theme.get("keywords", []), 0.9, "keyword")
    add_many(theme.get("mapping_rules", {}).get("anchor_keywords_any", []), 1.35, "anchor")
    add_many(theme.get("signals", {}).get("tag_hints", []), 0.65, "tag_hint")
    add_many(theme.get("signals", {}).get("target_object_hints", []), 0.65, "target_hint")
    for facet in theme.get("facets", []):
        add_many([facet.get("label", ""), facet.get("description", "")], 0.55, "facet")

    unique: dict[str, tuple[str, float, str]] = {}
    for term, weight, source in terms:
        norm = normalize(term)
        if not norm or norm in GENERIC_TERMS or len(norm) < 3:
            continue
        previous = unique.get(norm)
        if previous is None or weight > previous[1]:
            unique[norm] = (term, weight, source)
    return list(unique.values())


def contains_term(normalized_text: str, normalized_term: str) -> bool:
    if " " in normalized_term or "-" in normalized_term or "/" in normalized_term:
        return normalized_term in normalized_text
    return (
        re.search(rf"(?<![a-z0-9]){re.escape(normalized_term)}(?![a-z0-9])", normalized_text)
        is not None
    )


def term_hits(
    normalized_text: str, theme: dict[str, Any]
) -> tuple[float, list[dict[str, Any]], list[str]]:
    hits: list[dict[str, Any]] = []
    source_counter: Counter[str] = Counter()
    for term, weight, source in weighted_terms(theme):
        norm = normalize(term)
        if contains_term(normalized_text, norm):
            if norm in WEAK_SINGLE_TERMS and source in {
                "alias",
                "keyword",
                "label",
                "tag_hint",
                "target_hint",
            }:
                weight *= 0.22
            hits.append({"term": term, "weight": round(weight, 3), "source": source})
            source_counter[source] += 1
    weighted = sum(hit["weight"] for hit in hits)
    anchor_weight = sum(
        hit["weight"] for hit in hits if "anchor" in hit["source"] or hit["source"] == "label"
    )
    score = min(1.0, weighted / 4.2)
    if anchor_weight:
        score = min(1.0, score + min(0.25, anchor_weight / 8.0))
    return score, hits[:18], sorted(source_counter)


def lexical_similarity(normalized_text: str, theme: dict[str, Any]) -> float:
    probes = [
        theme.get("label", ""),
        theme.get("short_label", ""),
        *theme.get("aliases", []),
        *theme.get("mapping_rules", {}).get("anchor_keywords_any", []),
    ]
    scores = []
    for probe in probes:
        norm = normalize(str(probe))
        if not norm:
            continue
        if len(norm) < 6 or norm in WEAK_SINGLE_TERMS:
            continue
        contains = 1.0 if contains_term(normalized_text, norm) else 0.0
        ratio = SequenceMatcher(a=normalized_text[:2500], b=norm).ratio()
        scores.append(max(contains, ratio * 1.5))
    return min(1.0, max(scores) if scores else 0.0)


def facet_score(
    normalized_text: str, theme: dict[str, Any], semantic_score: float
) -> tuple[float, list[dict[str, Any]]]:
    facets = theme.get("facets", [])
    if not facets:
        return 0.0, []
    matched = []
    values = []
    for facet in facets:
        facet_terms = [facet.get("label", ""), facet.get("description", "")]
        hits = []
        for term in facet_terms:
            for token in re.split(r"[\s,/&()+-]+", normalize(str(term))):
                if (
                    token
                    and token not in GENERIC_TERMS
                    and len(token) >= 4
                    and contains_term(normalized_text, token)
                ):
                    hits.append(token)
        score = min(1.0, len(set(hits)) / 2.0)
        if score == 0 and semantic_score >= 0.28:
            score = min(0.45, semantic_score)
        if score >= 0.35:
            matched.append(
                {"facet_id": facet["id"], "score": round(score, 4), "terms": sorted(set(hits))[:8]}
            )
        values.append(score)
    return (sum(values) / len(values)), matched


def theme_profile(theme: dict[str, Any]) -> str:
    facets = " ".join(
        f"{f.get('label', '')} {f.get('description', '')}" for f in theme.get("facets", [])
    )
    anchors = " ".join(theme.get("mapping_rules", {}).get("anchor_keywords_any", []))
    signals = " ".join(
        theme.get("signals", {}).get("tag_hints", [])
        + theme.get("signals", {}).get("target_object_hints", [])
    )
    return " ".join(
        str(part)
        for part in [
            theme.get("label", ""),
            theme.get("short_label", ""),
            theme.get("description", ""),
            theme.get("management_summary", ""),
            " ".join(theme.get("aliases", [])),
            " ".join(theme.get("keywords", [])),
            anchors,
            signals,
            facets,
        ]
        if part
    )


def determine_strength(score: float, cfg: dict[str, Any]) -> str | None:
    if score >= float(cfg.get("strong_threshold", 0.82)):
        return "strong"
    if score >= float(cfg.get("medium_threshold", 0.70)):
        return "medium"
    if score >= float(cfg.get("weak_threshold", DEFAULT_ACCEPTANCE_THRESHOLD)):
        return "weak"
    return None


def confidence_score(
    semantic_score: float,
    term_score: float,
    lexical_score_value: float,
    facet_score_value: float,
    hits: list[dict[str, Any]],
    item: LibraryItem,
    theme: dict[str, Any],
) -> float:
    anchor_hits = [
        hit
        for hit in hits
        if "anchor" in hit["source"]
        or (
            hit["source"].endswith("_alias")
            and len(normalize(hit["term"])) >= 8
            and normalize(hit["term"]) not in WEAK_SINGLE_TERMS
        )
        or (
            hit["source"] in {"label", "alias"}
            and len(normalize(hit["term"])) >= 8
            and normalize(hit["term"]) not in WEAK_SINGLE_TERMS
        )
    ]
    title_norm = normalize(item.title)
    title_hit = (
        1.0 if any(contains_term(title_norm, normalize(hit["term"])) for hit in hits) else 0.0
    )
    final = (
        0.30 * min(1.0, semantic_score * 1.7)
        + 0.34 * term_score
        + 0.12 * lexical_score_value
        + 0.14 * facet_score_value
        + 0.10 * title_hit
    )

    if anchor_hits and term_score >= 0.22:
        final = max(final, 0.60 + min(0.18, term_score * 0.18))
    if len(hits) >= 3 and semantic_score >= 0.08:
        final = max(final, 0.60 + min(0.16, (len(hits) - 2) * 0.025 + semantic_score * 0.12))
    if title_hit and term_score >= 0.20:
        final = max(final, 0.62)

    negative = [normalize(value) for value in theme.get("negative_keywords", [])]
    item_norm = normalize(item_text(item))
    if any(value and contains_term(item_norm, value) for value in negative):
        final *= 0.45

    return round(min(1.0, max(0.0, final)), 4)


def has_enough_support(
    score: float,
    semantic_score: float,
    term_score: float,
    hits: list[dict[str, Any]],
    matched_facets: list[dict[str, Any]],
) -> bool:
    if score < DEFAULT_ACCEPTANCE_THRESHOLD:
        return False
    specific_hits = [
        hit
        for hit in hits
        if (
            "anchor" in hit["source"]
            or hit["source"] in {"label", "keyword", "alias"}
            or hit["source"].endswith("_alias")
        )
        and normalize(hit["term"]) not in WEAK_SINGLE_TERMS
        and len(normalize(hit["term"])) >= 5
    ]
    high_value_hits = [hit for hit in specific_hits if hit.get("weight", 0) >= 0.65]
    if any("anchor" in hit["source"] for hit in specific_hits):
        return True
    if len(high_value_hits) >= 2:
        return True
    if len(high_value_hits) == 1 and (semantic_score >= 0.06 or term_score >= 0.23):
        return True
    if semantic_score >= 0.26 and term_score >= 0.12:
        return True
    return semantic_score >= 0.32 and bool(matched_facets)


def build_mapping_for_year(
    year: int,
    catalog_root: Path,
    component_root: Path,
    max_themes: int,
    extra_catalogs: list[Path] | None = None,
) -> dict[str, Any]:
    cfg = load_yaml(ROOT / "data" / "configs" / "mapping-thresholds.yaml")
    pack_path = ROOT / "data" / "trend-packs" / f"trend-pack-{year}.yaml"
    pack = load_yaml(pack_path)
    themes = [theme for theme in pack["themes"] if theme.get("enabled", True)]

    controls, skipped_catalogs = extract_catalog_items(catalog_root, extra_catalogs)
    components, skipped_components = extract_component_items(component_root)
    items = controls + components
    if not items:
        return {
            "schema_version": "1.0.0",
            "year": year,
            "generated_at": dt.datetime.now(dt.UTC).isoformat(),
            "mapping_config": cfg,
            "source_roots": {"catalogs": "control_layer", "components": "implementation_layer"},
            "stats": {
                "controls_extracted": 0,
                "components_extracted": 0,
                "mapped_items": 0,
                "mapped_controls": 0,
                "mapped_components": 0,
                "acceptance_threshold": DEFAULT_ACCEPTANCE_THRESHOLD,
                "skipped_catalogs": skipped_catalogs,
                "skipped_component_definitions": skipped_components,
            },
            "mappings": [],
        }

    documents = [normalize(item_text(item)) for item in items]
    profiles = [normalize(theme_profile(theme)) for theme in themes]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), analyzer="word", min_df=1, sublinear_tf=True)
    matrix = vectorizer.fit_transform(documents + profiles)
    word_semantic = cosine_similarity(matrix[: len(items)], matrix[len(items) :])

    char_vectorizer = TfidfVectorizer(
        analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True
    )
    char_matrix = char_vectorizer.fit_transform(documents + profiles)
    char_semantic = cosine_similarity(char_matrix[: len(items)], char_matrix[len(items) :])

    mappings: list[dict[str, Any]] = []
    for item_idx, item in enumerate(items):
        item_norm = documents[item_idx]
        matches = []
        for theme_idx, theme in enumerate(themes):
            semantic_score = float(
                max(word_semantic[item_idx][theme_idx], char_semantic[item_idx][theme_idx] * 0.82)
            )
            term_score, hits, hit_sources = term_hits(item_norm, theme)
            lex = lexical_similarity(item_norm, theme)
            facets, matched_facets = facet_score(item_norm, theme, semantic_score)
            final_score = confidence_score(
                semantic_score, term_score, lex, facets, hits, item, theme
            )
            if not has_enough_support(
                final_score, semantic_score, term_score, hits, matched_facets
            ):
                continue
            strength = determine_strength(final_score, cfg)
            if not strength:
                continue
            matches.append(
                {
                    "trend_theme_id": theme["id"],
                    "cluster_id": theme["cluster_id"],
                    "final_score": final_score,
                    "strength": strength,
                    "scores": {
                        "semantic": round(semantic_score, 4),
                        "term": round(term_score, 4),
                        "lexical": round(lex, 4),
                        "facet": round(facets, 4),
                    },
                    "matched_facets": matched_facets,
                    "evidence": {
                        "keywords_hit": [
                            hit["term"]
                            for hit in hits
                            if hit["source"]
                            in {"keyword", "keyword_alias", "anchor", "anchor_alias"}
                        ][:12],
                        "anchors_hit": [hit["term"] for hit in hits if "anchor" in hit["source"]][
                            :12
                        ],
                        "hit_sources": hit_sources,
                        "excerpt": item_text(item)[:520],
                    },
                    "explainability": {
                        "short_reason": "Automatisch zugeordnet auf Basis von Trendbegriffen, semantischer Naehe und Facettenabdeckung.",
                        "management_reason": f"Der Inhalt erreicht {int(round(final_score * 100))}% fachliche Naehe zum Trend '{theme['label']}'.",
                    },
                }
            )
        matches = sorted(matches, key=lambda match: match["final_score"], reverse=True)[:max_themes]
        if matches:
            mapping: dict[str, Any] = {
                "item_type": item.item_type,
                "item_id": item_identifier(item),
                "id": item.id,
                "uuid": item.uuid,
                "title": item.title,
                "source_title": item.source_title,
                "source_uuid": item.source_uuid,
                "source_path": item.source_path,
                "matches": matches,
            }
            if item.item_type == "control":
                mapping["requirement_id"] = item.id
                mapping["catalog_id"] = item.source_uuid or item.source_title
            else:
                mapping["component_id"] = item.id
                mapping["component_definition_id"] = item.source_uuid or item.source_title
            mappings.append(mapping)

    return {
        "schema_version": "1.1.0",
        "year": year,
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "mapping_config": {
            **cfg,
            "acceptance_threshold": DEFAULT_ACCEPTANCE_THRESHOLD,
            "mapped_item_types": ["control", "component"],
            "engine": "local_tfidf_keyword_facet_hybrid_v2",
            "note": "Mappings are accepted at 60% or higher only when direct trend evidence or strong semantic/facet support is present.",
        },
        "source": {
            "trend_pack": str(pack_path.relative_to(ROOT)),
            "trend_pack_sha256": file_sha256(pack_path),
        },
        "source_roots": {"catalogs": "control_layer", "components": "implementation_layer"},
        "stats": {
            "controls_extracted": len(controls),
            "components_extracted": len(components),
            "mapped_items": len(mappings),
            "mapped_controls": len([item for item in mappings if item["item_type"] == "control"]),
            "mapped_components": len(
                [item for item in mappings if item["item_type"] == "component"]
            ),
            "acceptance_threshold": DEFAULT_ACCEPTANCE_THRESHOLD,
            "skipped_catalogs": skipped_catalogs,
            "skipped_component_definitions": skipped_components,
        },
        "mappings": mappings,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True, type=int)
    parser.add_argument("--catalog-root", type=Path, default=DEFAULT_CATALOG_ROOT)
    parser.add_argument("--component-root", type=Path, default=DEFAULT_COMPONENT_ROOT)
    parser.add_argument("--max-themes-per-item", type=int, default=3)
    parser.add_argument("--extra-catalog", type=Path, action="append", default=[])
    args = parser.parse_args()

    data = build_mapping_for_year(
        args.year,
        args.catalog_root,
        args.component_root,
        args.max_themes_per_item,
        args.extra_catalog,
    )
    target = ROOT / "data" / "mappings" / f"mappings-{args.year}.scored.json"
    dump_json(target, data)
    print(
        f"Trendmapping {args.year}: {data['stats']['mapped_items']} Inhalte gemappt "
        f"({data['stats']['mapped_controls']} Controls, {data['stats']['mapped_components']} Components)."
    )


if __name__ == "__main__":
    main()

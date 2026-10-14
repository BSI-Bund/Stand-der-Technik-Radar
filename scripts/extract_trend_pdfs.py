from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
from typing import Any

from _common import ROOT, dump_json, load_yaml
from oscal_items import normalize


def extract_pages(pdf_path: Path) -> list[dict[str, Any]]:
    try:
        import pdfplumber
    except Exception as exc:  # pragma: no cover - depends on local runtime
        raise SystemExit(
            "pdfplumber is required for PDF extraction. Install it with: py -m pip install pdfplumber"
        ) from exc

    pages = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
            pages.append({"page": index, "text": text.strip()})
    return pages


def evidence_for_theme(theme: dict[str, Any], pages: list[dict[str, Any]]) -> dict[str, Any]:
    terms = [
        theme.get("label", ""),
        theme.get("short_label", ""),
        *theme.get("aliases", []),
        *theme.get("keywords", []),
        *theme.get("mapping_rules", {}).get("anchor_keywords_any", []),
    ]
    normalized_terms = [(term, normalize(str(term))) for term in terms if normalize(str(term))]
    evidence = []
    total_hits = 0
    for page in pages:
        page_norm = normalize(page["text"])
        hits = []
        for term, term_norm in normalized_terms:
            if len(term_norm) >= 3 and term_norm in page_norm:
                hits.append(term)
        if hits:
            total_hits += len(set(hits))
            excerpt = page["text"][:900].replace("\n", " ")
            evidence.append(
                {"page": page["page"], "hits": sorted(set(hits))[:12], "excerpt": excerpt}
            )
    return {"hit_count": total_hits, "pages": evidence[:8]}


def extract_year(year: int) -> dict[str, Any]:
    pack_path = ROOT / "data" / "trend-packs" / f"trend-pack-{year}.yaml"
    pack = load_yaml(pack_path)
    source_file = ROOT / pack["source"]["file"]
    pages = extract_pages(source_file)
    themes = []
    for theme in pack["themes"]:
        themes.append(
            {
                "id": theme["id"],
                "label": theme["label"],
                "cluster_id": theme["cluster_id"],
                "keywords": theme.get("keywords", [])[:24],
                "facets": theme.get("facets", []),
                "pdf_evidence": evidence_for_theme(theme, pages),
            }
        )
    return {
        "schema_version": "1.0.0",
        "year": year,
        "source_title": pack["source"]["title"],
        "source_file": str(source_file.relative_to(ROOT)),
        "generated_at": dt.datetime.now(dt.UTC).isoformat(),
        "page_count": len(pages),
        "themes": themes,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, action="append")
    args = parser.parse_args()
    years = args.year or sorted(
        int(path.stem.removeprefix("trend-pack-"))
        for path in (ROOT / "data/trend-packs").glob("trend-pack-*.yaml")
    )
    for year in years:
        data = extract_year(year)
        target = (
            ROOT
            / "data"
            / "source"
            / "trends"
            / str(year)
            / "extracted"
            / f"trendanalyse_{year}.summary.json"
        )
        dump_json(target, data)
        print(f"PDF-Trends {year}: {len(data['themes'])} Themen mit PDF-Evidenz extrahiert.")


if __name__ == "__main__":
    main()

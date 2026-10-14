import json
from pathlib import Path

import aggregate_ui
import pytest


@pytest.mark.parametrize("year", [2024, 2025])
def test_aggregate_uses_only_isolated_fixture(tmp_path, monkeypatch, year):
    import yaml

    monkeypatch.setattr(aggregate_ui, "ROOT", tmp_path)
    root = Path(__file__).resolve().parents[2]
    pack_path = tmp_path / "data/trend-packs" / f"trend-pack-{year}.yaml"
    pack_path.parent.mkdir(parents=True)
    pack_path.write_text((root / "data/trend-packs" / pack_path.name).read_text())
    pack = yaml.safe_load(pack_path.read_text())
    theme = pack["themes"][0]
    mapping = tmp_path / "data/mappings" / f"mappings-{year}.scored.json"
    mapping.parent.mkdir(parents=True)
    mapping.write_text(
        json.dumps(
            {
                "mappings": [
                    {
                        "item_type": "control",
                        "id": "T-1",
                        "title": "Test",
                        "matches": [
                            {
                                "trend_theme_id": theme["id"],
                                "strength": "strong",
                                "final_score": 0.8,
                                "matched_facets": [],
                            }
                        ],
                    }
                ]
            }
        )
    )
    result = aggregate_ui.build_aggregate(year)
    found = next(t for t in result["themes"] if t["trend_theme_id"] == theme["id"])
    assert found["counts"]["controls_total"] == 1
    assert found["requirements"][0]["requirement_id"] == "T-1"
    assert found["radar"]["presence"] == 0.1
    assert found["counts"]["requirements_strong"] == 1

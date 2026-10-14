import json
from pathlib import Path

import jsonschema
import pytest
from public_data import public_aggregate

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize(
    "file,schema",
    [
        ("ui-manifest.json", "ui_manifest.schema.json"),
        ("trend-aggregates-2024.json", "trend_aggregates.schema.json"),
        ("trend-aggregates-2025.json", "trend_aggregates.schema.json"),
    ],
)
def test_public_contract(file, schema):
    jsonschema.validate(
        json.loads((ROOT / "public/generated" / file).read_text()),
        json.loads((ROOT / "schemas" / schema).read_text()),
    )


def test_projection_preserves_input_and_excludes_internal_data():
    data = {
        "schema_version": "1.1.0",
        "year": 2025,
        "generated_at": "test",
        "themes": [
            {"label": "A", "items": [{"evidence": "internal"}], "requirements": [{"id": "C-1"}]}
        ],
        "clusters": [],
        "kpis": [],
        "reproducibility": {"path": "private"},
    }
    public = public_aggregate(data)
    assert "reproducibility" not in public
    assert "items" not in public["themes"][0]
    assert public["themes"][0]["requirements"] == data["themes"][0]["requirements"]
    assert "items" in data["themes"][0]

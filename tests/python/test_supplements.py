import copy
import json
from pathlib import Path

from build_supplements import combine
from build_taxonomy_map import TAXONOMY, taxonomy_entries

ROOT = Path(__file__).resolve().parents[2]


def test_supplement_removal_restores_public_fallback_without_changing_trends():
    base = json.loads((ROOT / "data/snapshots/public-radar.json").read_text())
    catalog = json.loads((ROOT / "data/supplements/kernel-g0.json").read_text())
    config = json.loads((ROOT / "data/configs/radar-supplements.json").read_text())
    overlay = {**catalog, "replaces": config["catalogs"][0]["replaces"]}
    before = copy.deepcopy(base)
    augmented = combine(base, [overlay], taxonomy_entries(TAXONOMY))
    assert augmented["stats"]["mapped_controls"] == 949
    assert len([item for item in augmented["mappings"] if item["source_origin"] == "manual"]) == 901
    removed = combine(base, [], taxonomy_entries(TAXONOMY))
    assert removed == base
    assert base == before

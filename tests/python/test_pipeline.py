"""End-to-end data build with a tiny public source; no writes to real snapshots."""

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_complete_pipeline_public_boundary(tmp_path):
    from build_taxonomy_map import TAXONOMY, taxonomy_entries

    project = tmp_path / "project"
    project.mkdir()
    for directory in [
        "scripts",
        "schemas",
        "data/configs",
        "data/trend-packs",
        "data/source/taxonomy",
    ]:
        shutil.copytree(
            ROOT / directory,
            project / directory,
            ignore=shutil.ignore_patterns("__pycache__", "*.xlsx"),
        )
    (project / "data/configs/radar-supplements.json").write_text(
        json.dumps({"schema_version": "1.0.0", "catalogs": []})
    )
    repo = tmp_path / "library"
    (repo / "control_layer").mkdir(parents=True)
    (repo / "implementation_layer").mkdir()
    row = taxonomy_entries(TAXONOMY)[0]
    source = {
        "catalog": {
            "uuid": "fixture",
            "metadata": {"title": "Test-Katalog"},
            "controls": [
                {
                    "id": "T-1",
                    "title": "Cloud Security und künstliche Intelligenz",
                    "props": [
                        {"name": f"Taxonomy-L{i}", "value": row[f"Taxonomy-L{i}"]}
                        for i in range(1, 5)
                    ],
                }
            ],
        }
    }
    (repo / "control_layer/test.json").write_text(json.dumps(source))
    subprocess.run(
        [sys.executable, str(project / "scripts/build_all.py"), "--repo-root", str(repo)],
        check=True,
        capture_output=True,
        text=True,
    )
    public = project / "public/generated"
    assert {p.name for p in public.iterdir()} == {
        "taxonomy-map.json",
        "supplemental-catalogs.json",
        "ui-manifest.json",
        "trend-pack-2024.json",
        "trend-pack-2025.json",
        "trend-aggregates-2024.json",
        "trend-aggregates-2025.json",
    }
    taxonomy = json.loads((public / "taxonomy-map.json").read_text())
    assert taxonomy["stats"] == {"mapped_total": 1, "mapped_controls": 1, "mapped_components": 0}
    assert "sources" in json.loads((project / "data/build/taxonomy-map.json").read_text())["stats"]
    for file in public.iterdir():
        assert str(tmp_path) not in file.read_text()
    manifest = json.loads((public / "ui-manifest.json").read_text())
    assert all(not item["aggregates"].startswith("/") for item in manifest["available_years"])

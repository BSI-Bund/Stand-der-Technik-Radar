import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from build_taxonomy_map import TAXONOMY, build, public_view, taxonomy_entries


def write(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def props(path: tuple[str, ...]) -> list[dict]:
    return [{"name": f"Taxonomy-L{i}", "value": value} for i, value in enumerate(path, 1)]


def catalog(uuid: str, path: tuple[str, ...] | None, control_id: str = "C-1") -> dict:
    return {
        "catalog": {
            "uuid": uuid,
            "metadata": {"title": uuid},
            "controls": [
                {
                    "id": control_id,
                    "title": "Gemeinsames Control",
                    "props": [
                        {"name": "alt-identifier", "value": "same-identity"},
                        *(props(path) if path else []),
                    ],
                }
            ],
        }
    }


def repo(tmp_path: Path) -> Path:
    root = tmp_path / "public"
    (root / "control_layer").mkdir(parents=True)
    (root / "implementation_layer").mkdir(parents=True)
    return root


def test_same_control_identity_can_have_two_contextual_taxonomy_paths(tmp_path: Path) -> None:
    root = repo(tmp_path)
    entries = taxonomy_entries(TAXONOMY)
    a = tuple(entries[0][f"Taxonomy-L{i}"] for i in range(1, 5))
    b = tuple(entries[1][f"Taxonomy-L{i}"] for i in range(1, 5))
    write(root / "control_layer/WLAN/WLAN.json", catalog("wlan", a))
    write(root / "control_layer/Kernel/sources/Kernel.json", catalog("kernel", b))
    result = build(root, [])
    assert result["stats"]["mapped_controls"] == 2
    assert result["stats"]["unique_items"] == 1
    assert result["hierarchy"]["counts"]["total"] == 2
    assert {m["taxonomy"]["product_group"] for m in result["mappings"]} == {a[-1], b[-1]}
    assert all(m["identity"] == "same-identity" for m in result["mappings"])


def test_manual_copy_replaces_same_catalog_uuid_and_untagged_is_excluded(tmp_path: Path) -> None:
    root = repo(tmp_path)
    entry = taxonomy_entries(TAXONOMY)[0]
    path = tuple(entry[f"Taxonomy-L{i}"] for i in range(1, 5))
    write(root / "control_layer/Kernel/sources/Kernel.json", catalog("kernel", None))
    extra = tmp_path / "private" / "kernel-tagged.json"
    write(extra, catalog("kernel", path))
    result = build(root, [extra])
    assert result["stats"]["mapped_controls"] == 1
    assert result["mappings"][0]["source_origin"] == "manual"
    assert result["mappings"][0]["source_url"] is None
    assert str(tmp_path) not in json.dumps(result)
    assert result["stats"]["skipped_files"][0]["reason"] == "replaced_by_manual_catalog"


def test_manual_replaces_same_topic_even_after_catalog_uuid_changes(tmp_path: Path) -> None:
    root = repo(tmp_path)
    entry = taxonomy_entries(TAXONOMY)[0]
    path = tuple(entry[f"Taxonomy-L{i}"] for i in range(1, 5))
    write(root / "control_layer/WLAN/WLAN.json", catalog("public-version", path))
    extra = tmp_path / "private" / "WLAN.json"
    updated = catalog("new-version", path)
    updated["catalog"]["metadata"]["title"] = "public-version"
    write(extra, updated)
    result = build(root, [extra])
    assert result["stats"]["mapped_controls"] == 1
    assert result["mappings"][0]["source_origin"] == "manual"


def test_manual_g0_replaces_only_matching_kernel_variant(tmp_path: Path) -> None:
    root = repo(tmp_path)
    entry = taxonomy_entries(TAXONOMY)[0]
    path = tuple(entry[f"Taxonomy-L{i}"] for i in range(1, 5))
    plain = catalog("plain-uuid", None)
    plain["catalog"]["metadata"]["title"] = "Kernel"
    g0 = catalog("g0-uuid", None)
    g0["catalog"]["metadata"]["title"] = "Kernel"
    write(root / "control_layer/sources/Kernel-catalog.json", plain)
    write(root / "control_layer/sources/Kernel-G0-catalog.json", g0)
    extra = tmp_path / "Kernel-G0-catalog-with-taxonomy.json"
    tagged = catalog("new-g0-uuid", path)
    tagged["catalog"]["metadata"]["title"] = "Kernel"
    write(extra, tagged)
    result = build(root, [extra])
    assert result["stats"]["mapped_controls"] == 1
    assert result["stats"]["controls_extracted"] == 2
    assert [item["path"] for item in result["stats"]["skipped_files"]] == [
        "control_layer/sources/Kernel-G0-catalog.json"
    ]


def test_incomplete_and_unknown_paths_fail_instead_of_guessing(tmp_path: Path) -> None:
    root = repo(tmp_path)
    write(root / "control_layer/topic/a.json", catalog("broken", ("Govern", "nope", "x", "y")))
    with pytest.raises(ValueError, match="unknown_taxonomy_path"):
        build(root, [])
    write(root / "control_layer/topic/a.json", catalog("broken", ("Govern",)))
    with pytest.raises(ValueError, match="incomplete_or_duplicate_taxonomy_properties"):
        build(root, [])


def test_missing_taxonomy_is_counted_but_not_mapped(tmp_path: Path) -> None:
    root = repo(tmp_path)
    write(root / "control_layer/topic/a.json", catalog("untagged", None))
    result = build(root, [])
    assert result["stats"]["controls_without_taxonomy"] == 1
    assert result["stats"]["mapped_total"] == 0


def test_public_view_omits_internal_import_report(tmp_path: Path) -> None:
    root = repo(tmp_path)
    entry = taxonomy_entries(TAXONOMY)[0]
    path = tuple(entry[f"Taxonomy-L{i}"] for i in range(1, 5))
    write(root / "control_layer/topic/mapped.json", catalog("mapped", path))
    write(root / "control_layer/topic/untagged.json", catalog("untagged", None))

    internal = build(root, [])
    public = public_view(internal)

    assert internal["stats"]["controls_without_taxonomy"] == 1
    assert public["stats"] == {"mapped_total": 1, "mapped_controls": 1, "mapped_components": 0}
    assert public["mappings"] == internal["mappings"]
    assert "sources" not in public["stats"]
    assert "skipped_files" not in public["stats"]
    assert "controls_extracted" not in public["stats"]
    assert "without_taxonomy" not in json.dumps(public)

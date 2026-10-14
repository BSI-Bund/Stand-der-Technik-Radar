"""Explicit public projection; raw imports and diagnostics never become web assets."""

from copy import deepcopy


def public_aggregate(data: dict) -> dict:
    result = {
        key: deepcopy(data[key])
        for key in (
            "schema_version",
            "year",
            "generated_at",
            "themes",
            "clusters",
            "kpis",
            "highlights",
        )
        if key in data
    }
    for theme in result["themes"]:
        theme.pop("items", None)  # duplicates requirement/component arrays + internal evidence
    return result

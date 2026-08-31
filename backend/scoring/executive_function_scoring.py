"""
Executive Function Scoring Engine

Purpose:
    Calculate Executive Function questionnaire scores from EF1-EF42 items.

Important:
    - Items use a 1-5 Likert scale.
    - Higher item scores indicate stronger reported executive functioning.
    - Dimension mappings MUST be explicitly defined.
    - Do not infer item-to-dimension mappings from variable names.
"""

from typing import Dict, Any


# -------------------------------------------------------------------
# QUESTIONNAIRE ITEMS
# -------------------------------------------------------------------

EF_ITEMS = [
    "EF1", "EF2", "EF3", "EF4", "EF5",
    "EF6", "EF7", "EF8", "EF9", "EF10",
    "EF11", "EF13", "EF15", "EF17", "EF18",
    "EF19", "EF20", "EF21", "EF22", "EF23",
    "EF24", "EF26", "EF27", "EF31", "EF33",
    "EF34", "EF37", "EF38", "EF39", "EF40",
    "EF41", "EF42"
]


# -------------------------------------------------------------------
# EXECUTIVE FUNCTION DIMENSIONS
# -------------------------------------------------------------------

DIMENSIONS = [
    "SistemaAtencionalSupervisor",
    "RegulacionDeliberadaEmocion",
    "MonitorizacionConscieteResponsabilidades",
    "Verificaciondelaconducta",
    "Organizacionelemnetostareas",
    "Controlinhibitorio",
    "tomadedecisiones",
]


# -------------------------------------------------------------------
# ITEM -> DIMENSION MAPPING
#
# IMPORTANT:
# Fill this ONLY with the validated mapping from the original
# questionnaire/scoring documentation.
# -------------------------------------------------------------------

DIMENSION_ITEMS = {
    "SistemaAtencionalSupervisor": [],

    "RegulacionDeliberadaEmocion": [],

    "MonitorizacionConscieteResponsabilidades": [],

    "Verificaciondelaconducta": [],

    "Organizacionelemnetostareas": [],

    "Controlinhibitorio": [],

    "tomadedecisiones": [],
}


# -------------------------------------------------------------------
# VALIDATION
# -------------------------------------------------------------------

def validate_responses(responses: Dict[str, Any]) -> None:
    """
    Validate that all EF questionnaire items are present and
    contain valid 1-5 Likert values.
    """

    missing = [
        item for item in EF_ITEMS
        if item not in responses
    ]

    if missing:
        raise ValueError(
            f"Missing EF questionnaire items: {missing}"
        )

    invalid = {}

    for item in EF_ITEMS:
        value = responses[item]

        try:
            value = float(value)
        except (TypeError, ValueError):
            invalid[item] = value
            continue

        if value < 1 or value > 5:
            invalid[item] = value

    if invalid:
        raise ValueError(
            f"Invalid EF item values. Expected values 1-5: {invalid}"
        )


# -------------------------------------------------------------------
# TOTAL SCORE
# -------------------------------------------------------------------

def calculate_total_score(responses: Dict[str, Any]) -> Dict[str, float]:
    """
    Calculate the overall Executive Function score.

    Returns:
        raw_total
        mean_score
        normalized_score
    """

    validate_responses(responses)

    values = [
        float(responses[item])
        for item in EF_ITEMS
    ]

    raw_total = sum(values)
    mean_score = raw_total / len(values)

    # Convert 1-5 scale to 0-100.
    normalized_score = ((mean_score - 1) / 4) * 100

    return {
        "raw_total": round(raw_total, 2),
        "mean_score": round(mean_score, 2),
        "normalized_score": round(normalized_score, 2),
    }


# -------------------------------------------------------------------
# DIMENSION SCORES
# -------------------------------------------------------------------

def calculate_dimension_scores(
    responses: Dict[str, Any]
) -> Dict[str, Dict[str, float]]:
    """
    Calculate scores for each Executive Function dimension.

    Requires DIMENSION_ITEMS to be populated with the validated
    questionnaire mapping.
    """

    validate_responses(responses)

    results = {}

    for dimension, items in DIMENSION_ITEMS.items():

        if not items:
            results[dimension] = {
                "raw_total": None,
                "mean_score": None,
                "normalized_score": None,
                "item_count": 0,
            }
            continue

        values = [
            float(responses[item])
            for item in items
        ]

        raw_total = sum(values)
        mean_score = raw_total / len(values)
        normalized_score = ((mean_score - 1) / 4) * 100

        results[dimension] = {
            "raw_total": round(raw_total, 2),
            "mean_score": round(mean_score, 2),
            "normalized_score": round(normalized_score, 2),
            "item_count": len(items),
        }

    return results


# -------------------------------------------------------------------
# COMPLETE SCORING
# -------------------------------------------------------------------

def calculate_scores(
    responses: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Run the complete Executive Function scoring engine.
    """

    validate_responses(responses)

    total = calculate_total_score(responses)
    dimensions = calculate_dimension_scores(responses)

    return {
        "total": total,
        "dimensions": dimensions,
    }


# -------------------------------------------------------------------
# SIMPLE TEST
# -------------------------------------------------------------------

if __name__ == "__main__":

    test_responses = {
        item: 4
        for item in EF_ITEMS
    }

    result = calculate_scores(test_responses)

    print("=" * 70)
    print("EXECUTIVE FUNCTION SCORING TEST")
    print("=" * 70)

    print("\nTotal:")
    print(result["total"])

    print("\nDimensions:")
    for dimension, score in result["dimensions"].items():
        print(f"{dimension}: {score}")
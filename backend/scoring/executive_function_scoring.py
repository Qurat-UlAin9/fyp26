"""
Executive Function (EF) scoring engine.

STATUS: Organizacionelemnetostareas is fully validated (exact match against the
source SPSS composite across all 1,373 rows). The other six dimensions use a
"best recovered" item set — each carries near-1.0 regression weight and a sharp
drop-off for every other item, but the recovered sum does not exactly reproduce
the original composite for any row (a small residual remains). Evidence strongly
suggests the missing residual comes from item(s) that exist in the original
published ~41-item scale but are not present in this 32-item dataset export.
See EF_scoring_audit_report.md for the full evidence trail.

DO NOT present partial-status scores as equivalent in precision to the exact
dimension, and DO NOT use this engine's output to diagnose ADHD or any other
condition. It measures self-reported executive-function tendencies only.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Item -> dimension formulas (see module docstring + audit report for status)
# ---------------------------------------------------------------------------

DIMENSIONS = {
    'SistemaAtencionalSupervisor': {
        'items': ['EF10', 'EF15', 'EF17', 'EF19', 'EF27', 'EF39'],
        'status': 'partial',           # 'exact' | 'partial'
        'known_full_range': (12, 40),  # observed composite min/max in source data
    },
    'RegulacionDeliberadaEmocion': {
        'items': ['EF4', 'EF34', 'EF40', 'EF42'],
        'status': 'partial',
        'known_full_range': (5, 25),
    },
    'MonitorizacionConscieteResponsabilidades': {
        'items': ['EF2', 'EF8', 'EF9', 'EF18', 'EF38'],
        'status': 'partial',
        'known_full_range': (16, 35),
    },
    'Verificaciondelaconducta': {
        'items': ['EF24', 'EF31', 'EF33', 'EF41'],
        'status': 'partial',
        'known_full_range': (9, 25),
    },
    'Organizacionelemnetostareas': {
        'items': ['EF1', 'EF6', 'EF7', 'EF37'],
        'status': 'exact',
        'known_full_range': (7, 20),
    },
    'Controlinhibitorio': {
        'items': ['EF3', 'EF11', 'EF20', 'EF21', 'EF22', 'EF23'],
        'status': 'partial',
        'known_full_range': (17, 40),
    },
    'tomadedecisiones': {
        'items': ['EF5', 'EF13', 'EF26'],
        'status': 'partial',
        'known_full_range': (7, 25),
    },
}

ALL_ITEMS = sorted(
    {item for d in DIMENSIONS.values() for item in d['items']},
    key=lambda c: int(c[2:])
)

LIKERT_MIN, LIKERT_MAX = 1, 5


class EFValidationError(ValueError):
    pass


@dataclass
class DimensionScore:
    name: str
    status: str            # 'exact' or 'partial'
    items_used: List[str]
    raw_score: int
    mean_score: float
    n_items: int
    theoretical_min: int
    theoretical_max: int
    normalized_0_100: float
    note: Optional[str] = None


@dataclass
class EFScoringResult:
    dimensions: Dict[str, DimensionScore] = field(default_factory=dict)
    overall_score: Optional[float] = None  # intentionally None: no validated overall formula exists yet


def validate_responses(responses: Dict[str, int]) -> None:
    """Raise EFValidationError if responses are missing or out of range.

    Only validates items actually required by at least one dimension formula
    (ALL_ITEMS) -- callers may supply more items, e.g. from the full instrument,
    without triggering an error.
    """
    missing = [item for item in ALL_ITEMS if item not in responses]
    if missing:
        raise EFValidationError(f"Missing required EF item responses: {missing}")

    out_of_range = [
        item for item in ALL_ITEMS
        if not (LIKERT_MIN <= responses[item] <= LIKERT_MAX)
    ]
    if out_of_range:
        raise EFValidationError(
            f"Responses out of range [{LIKERT_MIN}-{LIKERT_MAX}] for items: {out_of_range}"
        )


def score_dimension(name: str, responses: Dict[str, int]) -> DimensionScore:
    spec = DIMENSIONS[name]
    items = spec['items']
    n = len(items)
    raw = sum(responses[i] for i in items)
    theoretical_min, theoretical_max = n * LIKERT_MIN, n * LIKERT_MAX
    normalized = 100 * (raw - theoretical_min) / (theoretical_max - theoretical_min)

    note = None
    if spec['status'] == 'partial':
        note = (
            "Partial recovery: this dimension's original composite could not be "
            "exactly reproduced from the 32 EF items present in this dataset. "
            "The items below carry near-certain (~1.0 regression weight) membership, "
            "but the score may run a few points lower than the original scale intended, "
            "since 1-2 contributing item(s) appear to be absent from this data export."
        )

    return DimensionScore(
        name=name,
        status=spec['status'],
        items_used=items,
        raw_score=raw,
        mean_score=raw / n,
        n_items=n,
        theoretical_min=theoretical_min,
        theoretical_max=theoretical_max,
        normalized_0_100=normalized,
        note=note,
    )


def score_all(responses: Dict[str, int]) -> EFScoringResult:
    """Score every EF dimension from a dict of {item_name: 1-5 response}.

    Does NOT compute an overall EF composite: no validated formula for an
    overall score exists yet (per project scoring-engine requirements, an
    overall score should only be produced once such a formula is established
    and validated).

    This function never produces or implies an ADHD diagnosis.
    """
    validate_responses(responses)
    result = EFScoringResult()
    for name in DIMENSIONS:
        result.dimensions[name] = score_dimension(name, responses)
    return result


if __name__ == '__main__':
    # smoke test with a fabricated all-3 response set
    demo_responses = {item: 3 for item in ALL_ITEMS}
    result = score_all(demo_responses)
    for name, d in result.dimensions.items():
        print(f"{name}: raw={d.raw_score}/{d.theoretical_max} "
              f"mean={d.mean_score:.2f} norm={d.normalized_0_100:.1f} status={d.status}")

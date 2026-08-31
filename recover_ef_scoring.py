# Run locally from the project root:
#   python -m pip install pyreadstat pandas numpy
#   python recover_ef_scoring.py

from pathlib import Path
import itertools
import json
import numpy as np
import pandas as pd
import pyreadstat

BASE = Path(__file__).resolve().parent
RAW = BASE / "backend" / "data" / "executive_function" / "ef_raw.sav"

EF_ITEMS = [
    "EF1","EF2","EF3","EF4","EF5","EF6","EF7","EF8","EF9","EF10",
    "EF11","EF13","EF15","EF17","EF18","EF19","EF20","EF21","EF22",
    "EF23","EF24","EF26","EF27","EF31","EF33","EF34","EF37","EF38",
    "EF39","EF40","EF41","EF42"
]

DIMENSIONS = [
    "SistemaAtencionalSupervisor",
    "RegulacionDeliberadaEmocion",
    "MonitorizacionConscieteResponsabilidades",
    "Verificaciondelaconducta",
    "Organizacionelemnetostareas",
    "Controlinhibitorio",
    "tomadedecisiones",
]

# Published original 8-factor mapping.
# These are used as candidate/reference factors only.
PUBLISHED = {
    "attention": ["EF10","EF27","EF15","EF17","EF39","EF35","EF19","EF30"],
    "supervision": ["EF9","EF8","EF2","EF29","EF18","EF38","EF25"],
    "emotion": ["EF42","EF34","EF14","EF40","EF4","EF28","EF23"],
    "verification": ["EF31","EF24","EF41","EF33"],
    "regulation": ["EF22","EF20","EF21","EF12"],
    "organization": ["EF6","EF7","EF1","EF37"],
    "decision": ["EF26","EF5","EF13","EF16"],
    "inhibition": ["EF11","EF3","EF32"],
}


def load():
    if not RAW.exists():
        raise FileNotFoundError(f"Could not find: {RAW}")

    df, meta = pyreadstat.read_sav(
        str(RAW),
        apply_value_formats=False
    )
    return df, meta


def clean(df):
    out = df.copy()

    # Numeric conversion for EF items.
    for col in EF_ITEMS:
        out[col] = pd.to_numeric(out[col], errors="coerce")

    missing = out[EF_ITEMS].isna().sum()
    invalid = {
        col: int(((out[col] < 1) | (out[col] > 5)).sum())
        for col in EF_ITEMS
    }

    duplicate_rows = int(out.duplicated().sum())

    report = {
        "rows": int(len(out)),
        "columns": int(len(out.columns)),
        "missing_by_item": missing[missing > 0].to_dict(),
        "invalid_by_item": {k:v for k,v in invalid.items() if v},
        "duplicate_rows": duplicate_rows,
    }

    if report["missing_by_item"]:
        raise ValueError(f"Missing EF values found: {report['missing_by_item']}")

    if report["invalid_by_item"]:
        raise ValueError(f"Invalid EF values found: {report['invalid_by_item']}")

    return out, report


def mean_score(df, items):
    return df[items].mean(axis=1)


def sum_score(df, items):
    return df[items].sum(axis=1)


def compare(pred, target):
    pred = np.asarray(pred, dtype=float)
    target = np.asarray(target, dtype=float)

    diff = pred - target

    return {
        "exact_match": bool(np.allclose(pred, target, atol=1e-9)),
        "max_abs_difference": float(np.max(np.abs(diff))),
        "mean_abs_difference": float(np.mean(np.abs(diff))),
        "correlation": (
            float(np.corrcoef(pred, target)[0,1])
            if np.std(pred) > 0 and np.std(target) > 0 else None
        ),
    }


def main():
    df, meta = load()
    df, cleaning = clean(df)

    print("=" * 80)
    print("EXECUTIVE FUNCTION DATASET VALIDATION")
    print("=" * 80)
    print(json.dumps(cleaning, indent=2, ensure_ascii=False))

    print("\nAvailable dimension columns:")
    for d in DIMENSIONS:
        print(f"  {d}: min={df[d].min()}, max={df[d].max()}")

    # Test the published factors against any dimension with the same
    # theoretical maximum. This is diagnostic only.
    print("\nPublished-factor diagnostics:")
    for name, items in PUBLISHED.items():
        present = [x for x in items if x in df.columns]
        if not present:
            continue

        s = sum_score(df, present)
        print(
            f"  {name}: items present={present}, "
            f"count={len(present)}, max_possible={5*len(present)}, "
            f"observed_max={s.max()}"
        )

    # Export cleaned dataset.
    out_dir = BASE / "backend" / "data" / "executive_function" / "cleaned"
    out_dir.mkdir(parents=True, exist_ok=True)

    clean_csv = out_dir / "executive_function_clean.csv"
    df.to_csv(clean_csv, index=False)

    report_path = out_dir / "cleaning_report.json"
    report_path.write_text(
        json.dumps(cleaning, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print(f"\nClean dataset: {clean_csv}")
    print(f"Cleaning report: {report_path}")

    print("\nIMPORTANT:")
    print("The 7-factor mapping must be recovered/validated against the")
    print("existing composite columns before production scoring is enabled.")


if __name__ == "__main__":
    main()

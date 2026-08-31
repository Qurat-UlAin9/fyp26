import os
import json
import pandas as pd
import pyreadstat


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SAV_PATH = os.path.join(
    BASE_DIR,
    "backend",
    "data",
    "executive_function",
    "ef_raw.sav"
)

XLSX_PATH = os.path.join(
    BASE_DIR,
    "backend",
    "data",
    "executive_function",
    "ef_raw.xlsx"
)

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "backend",
    "data",
    "executive_function",
    "metadata_inspection"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# HELPER
# ============================================================

def section(title):
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


# ============================================================
# SAV INSPECTION
# ============================================================

section("READING SPSS .SAV")

df_sav, meta = pyreadstat.read_sav(
    SAV_PATH,
    apply_value_formats=False
)

print(f"Rows:    {df_sav.shape[0]:,}")
print(f"Columns: {df_sav.shape[1]:,}")

# ------------------------------------------------------------
# Variable metadata
# ------------------------------------------------------------

section("SAV VARIABLE METADATA")

variable_metadata = []

for i, column in enumerate(df_sav.columns, start=1):

    variable_metadata.append({
        "position": i,
        "variable_name": column,
        "variable_label": meta.column_names_to_labels.get(column, ""),
        "measurement_level": meta.variable_measure.get(column, ""),
        "format": meta.original_variable_types.get(column, "")
    })

metadata_df = pd.DataFrame(variable_metadata)

print(metadata_df.to_string(index=False))

metadata_df.to_csv(
    os.path.join(OUTPUT_DIR, "sav_variable_metadata.csv"),
    index=False,
    encoding="utf-8-sig"
)


# ------------------------------------------------------------
# Value labels
# ------------------------------------------------------------

section("SAV VALUE LABELS")

value_labels_output = []

for column in df_sav.columns:

    variable_label = meta.column_names_to_labels.get(column, "")

    # pyreadstat returns the value-label dictionary directly
    labels = meta.variable_value_labels.get(column, {})

    print(f"\n--- {column} ---")
    print(f"Variable label: {variable_label}")

    if labels:
        print("Value labels:")

        for value, label in labels.items():
            print(f"  {value} = {label}")

            value_labels_output.append({
                "variable_name": column,
                "variable_label": variable_label,
                "value": value,
                "value_label": label
            })
    else:
        print("No value labels found.")


value_labels_df = pd.DataFrame(value_labels_output)

value_labels_df.to_csv(
    os.path.join(
        OUTPUT_DIR,
        "sav_value_labels.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)


# ------------------------------------------------------------
# Dataset / file metadata
# ------------------------------------------------------------

section("SAV DATASET METADATA")

dataset_metadata = {
    "file": os.path.basename(SAV_PATH),
    "rows": int(df_sav.shape[0]),
    "columns": int(df_sav.shape[1]),
    "file_label": meta.file_label,
    "file_encoding": meta.file_encoding,
    "number_rows": meta.number_rows,
    "number_columns": meta.number_columns,
    "creation_time": str(meta.creation_time),
    "modified_time": str(meta.modified_time),
    "notes": meta.notes,
    "column_names": list(df_sav.columns)
}

print(json.dumps(dataset_metadata, indent=2, ensure_ascii=False, default=str))

with open(
    os.path.join(OUTPUT_DIR, "sav_dataset_metadata.json"),
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        dataset_metadata,
        f,
        indent=2,
        ensure_ascii=False,
        default=str
    )


# ------------------------------------------------------------
# First 10 rows
# ------------------------------------------------------------

section("SAV FIRST 10 ROWS")

print(df_sav.head(10).to_string(index=False))

df_sav.head(10).to_csv(
    os.path.join(OUTPUT_DIR, "sav_first_10_rows.csv"),
    index=False,
    encoding="utf-8-sig"
)


# ============================================================
# XLSX INSPECTION
# ============================================================

section("READING EXCEL .XLSX")

excel_file = pd.ExcelFile(XLSX_PATH)

print(f"Number of sheets: {len(excel_file.sheet_names)}")
print(f"Sheets: {excel_file.sheet_names}")

xlsx_metadata = []

for sheet_name in excel_file.sheet_names:

    df_xlsx = pd.read_excel(
        XLSX_PATH,
        sheet_name=sheet_name
    )

    section(f"XLSX SHEET: {sheet_name}")

    print(f"Rows:    {df_xlsx.shape[0]:,}")
    print(f"Columns: {df_xlsx.shape[1]:,}")

    print("\nColumn names:")

    for i, column in enumerate(df_xlsx.columns, start=1):
        print(f"{i:03d}. {column}")

    xlsx_metadata.append({
        "sheet_name": sheet_name,
        "rows": int(df_xlsx.shape[0]),
        "columns": int(df_xlsx.shape[1]),
        "column_names": list(df_xlsx.columns)
    })


with open(
    os.path.join(OUTPUT_DIR, "xlsx_metadata.json"),
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        xlsx_metadata,
        f,
        indent=2,
        ensure_ascii=False
    )


# ============================================================
# SAV vs XLSX COLUMN COMPARISON
# ============================================================

section("SAV vs XLSX COLUMN COMPARISON")

df_xlsx = pd.read_excel(XLSX_PATH)

sav_columns = list(df_sav.columns)
xlsx_columns = list(df_xlsx.columns)

only_sav = [c for c in sav_columns if c not in xlsx_columns]
only_xlsx = [c for c in xlsx_columns if c not in sav_columns]
common = [c for c in sav_columns if c in xlsx_columns]

print(f"SAV columns:  {len(sav_columns)}")
print(f"XLSX columns: {len(xlsx_columns)}")
print(f"Common:       {len(common)}")

print("\nOnly in SAV:")
print(only_sav)

print("\nOnly in XLSX:")
print(only_xlsx)


# ============================================================
# DATA VALUE COMPARISON
# ============================================================

section("SAV vs XLSX DATA COMPARISON")

if sav_columns == xlsx_columns and df_sav.shape == df_xlsx.shape:

    differences = []

    for column in common:

        sav_values = df_sav[column].reset_index(drop=True)
        xlsx_values = df_xlsx[column].reset_index(drop=True)

        # Compare safely including NaN
        equal = (
            sav_values.eq(xlsx_values)
            | (sav_values.isna() & xlsx_values.isna())
        )

        difference_count = int((~equal).sum())

        differences.append({
            "column": column,
            "different_values": difference_count
        })

        print(
            f"{column}: "
            f"{difference_count} different values"
        )

    comparison_df = pd.DataFrame(differences)

    comparison_df.to_csv(
        os.path.join(
            OUTPUT_DIR,
            "sav_xlsx_value_comparison.csv"
        ),
        index=False,
        encoding="utf-8-sig"
    )

else:

    print("Cannot perform row-by-row comparison.")
    print("Column names or dimensions differ.")


# ============================================================
# EF ITEM SUMMARY
# ============================================================

section("EF ITEM METADATA SUMMARY")

ef_columns = [
    c for c in df_sav.columns
    if c.startswith("EF")
]

ef_summary = []

for column in ef_columns:

    ef_summary.append({
        "variable": column,
        "label": meta.column_names_to_labels.get(column, ""),
        "measurement": meta.variable_measure.get(column, ""),
        "value_label_set": meta.variable_value_labels.get(column, ""),
        "unique_values": sorted(
            df_sav[column].dropna().unique().tolist()
        )
    })

ef_summary_df = pd.DataFrame(ef_summary)

print(ef_summary_df.to_string(index=False))

ef_summary_df.to_csv(
    os.path.join(
        OUTPUT_DIR,
        "ef_items_metadata.csv"
    ),
    index=False,
    encoding="utf-8-sig"
)


# ============================================================
# FINAL
# ============================================================

section("INSPECTION COMPLETE")

print("Generated files:")
print(f"  {OUTPUT_DIR}")

for filename in sorted(os.listdir(OUTPUT_DIR)):
    print(f"  - {filename}")
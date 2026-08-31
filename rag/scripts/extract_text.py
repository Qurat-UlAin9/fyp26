"""
STEP 1 — Extract text from a PDF.

Usage:
    python extract_text.py rag/raw/tier1_clinical/peds_20192528.pdf

Writes: rag/output/extracted/peds_20192528.txt
Each page is wrapped in [PAGE N] ... [/PAGE N] markers so the chunker
can later tag every chunk with the page(s) it came from.
"""

import sys
from pathlib import Path

import fitz  # PyMuPDF

from config import EXTRACTED_DIR


def extract_pdf(pdf_path: Path) -> Path:
    if not pdf_path.exists():
        raise FileNotFoundError(f"No such file: {pdf_path}")

    doc = fitz.open(pdf_path)
    out_lines = []

    for page_num, page in enumerate(doc, start=1):
        # "text" mode respects reading order reasonably well for
        # single/double column academic PDFs. If a document comes out
        # garbled (columns interleaved), try page.get_text("blocks")
        # instead and sort blocks by (y, x) — flag it if that happens.
        text = page.get_text("text")
        out_lines.append(f"[PAGE {page_num}]")
        out_lines.append(text.strip())
        out_lines.append(f"[/PAGE {page_num}]\n")

    doc.close()

    out_path = EXTRACTED_DIR / f"{pdf_path.stem}.txt"
    out_path.write_text("\n".join(out_lines), encoding="utf-8")
    return out_path


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_text.py <path_to_pdf>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    out_path = extract_pdf(pdf_path)
    print(f"Extracted -> {out_path}")
    print(f"({out_path.stat().st_size} bytes)")

"""Write a concise, reproducible directory tree for this project."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "project-structure.txt"
IGNORE = {".git", "node_modules", ".expo", "__pycache__", ".pytest_cache", "dist", "web-build"}


def walk(path: Path, prefix: str = "") -> list[str]:
    entries = sorted((item for item in path.iterdir() if item.name not in IGNORE), key=lambda item: (not item.is_dir(), item.name.lower()))
    lines: list[str] = []
    for index, item in enumerate(entries):
        last = index == len(entries) - 1
        marker = "└── " if last else "├── "
        lines.append(f"{prefix}{marker}{item.name}{'/' if item.is_dir() else ''}")
        if item.is_dir():
            lines.extend(walk(item, prefix + ("    " if last else "│   ")))
    return lines


if __name__ == "__main__":
    OUTPUT.write_text(f"{ROOT.name}/\n" + "\n".join(walk(ROOT)) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")

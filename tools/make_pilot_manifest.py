"""Freeze the exploratory pilot into research/pilot (WP-0.2, SSD Appendix A.6).

Copies the pilot code, reports and small result files from Study-docs/research into
research/pilot/files and writes research/pilot/PROVENANCE.json with a SHA-256 for every file in the
source folder. Large inputs (price caches, the ephemeris file) are hashed but not copied: the price
caches are git-ignored, so their hashes are the only record of what data the pilot saw.

Usage:  python tools/make_pilot_manifest.py          (run once; the result is then read-only)
"""
import csv
import hashlib
import io
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Study-docs" / "research"
DST = ROOT / "research" / "pilot"
FILES = DST / "files"

SKIP_COPY_NAMES = {"de421.bsp"}
SKIP_COPY_PREFIXES = ("price_cache",)
SKIP_COPY_EXACT = {"track1_cache.csv"}
SKIP_DIRS = {"__pycache__"}
# classical-source write-ups are inputs to the SSD, not part of the pilot
SKIP_COPY_ARCHIVE_SUFFIX = (".md",)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def is_data_cache(p: Path) -> bool:
    return p.name.startswith(SKIP_COPY_PREFIXES) or p.name in SKIP_COPY_EXACT


def should_copy(p: Path, rel: Path) -> bool:
    if p.name in SKIP_COPY_NAMES or is_data_cache(p):
        return False
    if rel.parts[0] == "archive" and p.suffix in SKIP_COPY_ARCHIVE_SUFFIX:
        return False
    return True


def cache_facts(p: Path) -> dict:
    """First and last date and row count of a cached price file (first column is the date)."""
    with io.open(p, encoding="utf-8", newline="") as f:
        rows = list(csv.reader(f))
    dates = [r[0] for r in rows[1:] if r and r[0]]
    return {"header": rows[0][:6], "rows": len(dates), "first": dates[0], "last": dates[-1]}


def main() -> None:
    if FILES.exists():
        raise SystemExit("research/pilot/files already exists; the frozen copy is read-only")
    entries = []
    for p in sorted(SRC.rglob("*")):
        if not p.is_file() or any(part in SKIP_DIRS for part in p.parts):
            continue
        rel = p.relative_to(SRC)
        copied = should_copy(p, rel)
        entry = {"path": rel.as_posix(), "bytes": p.stat().st_size, "sha256": sha256(p), "copied": copied}
        if is_data_cache(p):
            entry["cache"] = cache_facts(p)
        if copied:
            target = FILES / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, target)
        entries.append(entry)
    commit = subprocess.run(
        ["git", "-C", str(ROOT), "log", "-1", "--format=%H", "--", "Study-docs/research"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    manifest = {
        "source": "Study-docs/research",
        "sourceLastCommit": commit,
        "frozenOn": "2026-10-17",
        "note": "Files with copied=false were hashed but not copied (git-ignored data or a public ephemeris file).",
        "files": entries,
    }
    DST.mkdir(parents=True, exist_ok=True)
    (DST / "PROVENANCE.json").write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    print(len(entries), "files hashed;", sum(e["copied"] for e in entries), "copied")


if __name__ == "__main__":
    main()

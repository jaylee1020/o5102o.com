import argparse
import json
import sys
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Optional


DEFAULT_BOOK_CANDIDATES = (
    Path.cwd() / "book.md",
    Path(__file__).resolve().parent / "book.md",
)


def is_hangul(char: str) -> bool:
    return "HANGUL" in unicodedata.name(char, "")


def is_symbol(char: str) -> bool:
    return unicodedata.category(char)[0] in {"P", "S"}


def is_latin(char: str) -> bool:
    return "LATIN" in unicodedata.name(char, "")


def top_chars(counter: Counter[str], limit: int) -> list[str]:
    return [char for char, _ in counter.most_common(limit)]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze the most frequent characters in a book markdown file."
    )
    parser.add_argument(
        "--input",
        type=Path,
        help="Path to the markdown file to analyze. Defaults to nearby book.md files when available.",
    )
    return parser.parse_args()


def resolve_book_path(input_path: Optional[Path]) -> Path:
    if input_path is not None:
        return input_path.expanduser().resolve()

    for candidate in DEFAULT_BOOK_CANDIDATES:
        expanded = candidate.expanduser()
        if expanded.exists() and expanded.is_file():
            return expanded.resolve()

    raise FileNotFoundError(
        "No input file provided. Place book.md in the current directory, "
        "place book.md next to this script, or run with --input /path/to/book.md."
    )


def main() -> None:
    args = parse_args()

    try:
        book_path = resolve_book_path(args.input)
        text = book_path.read_text(encoding="utf-8")
    except (FileNotFoundError, IsADirectoryError, PermissionError, UnicodeDecodeError) as error:
        print(error, file=sys.stderr)
        raise SystemExit(2) from error

    chars = [char for char in text if not char.isspace()]

    counts = Counter(chars)
    symbols = Counter(char for char in chars if is_symbol(char))
    latin = Counter(char for char in chars if is_latin(char))
    hangul = Counter(char for char in chars if is_hangul(char))

    report = {
        "book_path": str(book_path),
        "total_non_whitespace": len(chars),
        "top_symbols": top_chars(symbols, 24),
        "top_latin": top_chars(latin, 20),
        "top_hangul": top_chars(hangul, 24),
        "top_overall": top_chars(counts, 32),
    }

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

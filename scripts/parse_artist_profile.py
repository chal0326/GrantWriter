#!/usr/bin/env python3
"""
Target Profiling Module
Ingests an artist's CV (PDF or plain text) and outputs a structured JSON profile
containing their discipline, goals, career highlights, and grant-relevant metadata.

Usage:
    python scripts/parse_artist_profile.py --cv path/to/cv.pdf
    python scripts/parse_artist_profile.py --cv path/to/cv.txt --output profile.json
    python scripts/parse_artist_profile.py --cv path/to/cv.txt --no-llm  # heuristic-only mode
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# CV Text Extraction
# ---------------------------------------------------------------------------

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract raw text from a PDF file using pypdf."""
    try:
        import pypdf
    except ImportError:
        sys.exit(
            "Error: 'pypdf' is required for PDF parsing. "
            "Install it with: pip install pypdf"
        )

    text_parts = []
    with open(pdf_path, "rb") as fh:
        reader = pypdf.PdfReader(fh)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    return "\n".join(text_parts)


def extract_text(cv_path: str) -> str:
    """Dispatch to the correct extractor based on file extension."""
    path = Path(cv_path)
    if not path.exists():
        sys.exit(f"Error: File not found: {cv_path}")

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(cv_path)
    elif suffix in (".txt", ".md", ".rtf", ""):
        return path.read_text(encoding="utf-8", errors="replace")
    else:
        sys.exit(
            f"Error: Unsupported file type '{suffix}'. "
            "Supported: .pdf, .txt, .md"
        )


# ---------------------------------------------------------------------------
# Heuristic Parsing (no LLM required)
# ---------------------------------------------------------------------------

# Canonical discipline keywords mapped to a normalized label
DISCIPLINE_KEYWORDS: dict[str, list[str]] = {
    "Visual Art": [
        "painting", "sculptor", "sculpture", "drawing", "printmaking",
        "ceramics", "illustration", "mixed media", "installation art",
        "collage", "photography", "photographer", "textile", "fiber art",
        "muralist", "mural",
    ],
    "Performance Art": [
        "performance art", "live art", "durational", "body art",
    ],
    "Film & Video": [
        "filmmaker", "film", "video art", "cinematographer", "director",
        "documentary", "animation", "animator",
    ],
    "Music": [
        "composer", "musician", "singer", "vocalist", "instrumentalist",
        "conductor", "sound artist", "audio art",
    ],
    "Theater & Dance": [
        "choreographer", "dancer", "playwright", "theater", "theatre",
        "dramatic", "performance", "dance",
    ],
    "Literary Arts": [
        "poet", "poetry", "novelist", "fiction", "nonfiction", "writer",
        "author", "essayist", "short story",
    ],
    "New Media / Digital": [
        "digital art", "new media", "interactive", "generative", "net art",
        "software art", "VR", "AR", "augmented reality", "virtual reality",
        "data visualization",
    ],
    "Public Art": [
        "public art", "community art", "street art", "urban art",
        "site-specific", "placemaking",
    ],
    "Craft": [
        "jeweler", "jewelry", "woodwork", "metalwork", "glass",
        "bookbinding", "weaving",
    ],
}

GOAL_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("community_engagement",
     re.compile(r"\b(community|engage|outreach|workshop|education|youth|school|underserved|underrepresented)\b", re.I)),
    ("social_justice",
     re.compile(r"\b(social justice|equity|equality|activism|advocacy|racial|gender|LGBTQ|immigrant|diaspora)\b", re.I)),
    ("cultural_preservation",
     re.compile(r"\b(heritage|tradition|culture|indigenous|ancestral|archive|preservation|history)\b", re.I)),
    ("environmental",
     re.compile(r"\b(environment|ecology|climate|nature|sustainability|land art|earth)\b", re.I)),
    ("interdisciplinary",
     re.compile(r"\b(interdisciplinary|cross-disciplin|collaborative|collaboration|hybrid|fusion)\b", re.I)),
    ("experimental",
     re.compile(r"\b(experimental|avant-garde|innovative|new|emerging|pioneering|boundary)\b", re.I)),
    ("narrative_storytelling",
     re.compile(r"\b(narrative|story|storytelling|memoir|autobiography|personal history)\b", re.I)),
]

SECTION_HEADERS = re.compile(
    r"^(?P<header>"
    r"education|experience|exhibitions?|residencies|residency|"
    r"(?:awards?|grants?|fellowships?|honors?|distinctions?)"
    r"(?:\s*[&/,]\s*(?:awards?|grants?|fellowships?|honors?|distinctions?))*|"
    r"publications?|performances?|"
    r"selected works?|bibliography|skills|statement|bio|biography|"
    r"collections?|press|teaching|curatorial|commissions?"
    r")\s*:?\s*$",
    re.I | re.M,
)

YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
DEGREE_RE = re.compile(
    r"\b(MFA|BFA|MA|BA|MS|BS|PhD|M\.F\.A\.|B\.F\.A\.|M\.A\.|B\.A\.)\b"
)
AWARD_SECTION_RE = re.compile(
    r"^(awards?|grants?|fellowships?|honors?|distinctions?)\s*:?\s*$",
    re.I | re.M,
)


def detect_disciplines(text: str) -> list[str]:
    found = []
    for discipline, keywords in DISCIPLINE_KEYWORDS.items():
        for kw in keywords:
            # Use word-boundary matching so "AR" won't hit "years"
            pattern = re.compile(r"\b" + re.escape(kw) + r"\b", re.I)
            if pattern.search(text):
                found.append(discipline)
                break
    return found or ["Unclassified"]


def detect_goals(text: str) -> list[str]:
    return [label for label, pattern in GOAL_PATTERNS if pattern.search(text)]


def extract_years(text: str) -> list[int]:
    return sorted({int(y) for y in YEAR_RE.findall(text)})


def extract_education(text: str) -> list[str]:
    degrees = DEGREE_RE.findall(text)
    return list(dict.fromkeys(degrees))  # deduplicate, preserve order


def extract_sections(text: str) -> dict[str, str]:
    """Split CV text into named sections."""
    sections: dict[str, str] = {}
    positions = [(m.start(), m.group("header").lower()) for m in SECTION_HEADERS.finditer(text)]

    for i, (start, header) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        # skip the header line itself
        content_start = text.index("\n", start) + 1 if "\n" in text[start:end] else end
        sections[header] = text[content_start:end].strip()

    return sections


def extract_awards(text: str) -> list[str]:
    """Pull bullet lines from award/grant/fellowship sections."""
    sections = extract_sections(text)
    award_terms = {"award", "grant", "fellowship", "honor", "distinction"}
    awards: list[str] = []
    for key, content in sections.items():
        # Match any section whose name contains an award-related term
        if any(term in key for term in award_terms):
            for line in content.splitlines():
                line = line.strip().lstrip("-•*·").strip()
                if line and len(line) > 5:
                    awards.append(line)
    return awards[:10]  # cap at 10 for readability


def extract_career_span(years: list[int]) -> dict[str, int | None]:
    if not years:
        return {"start": None, "end": None, "active_years": None}
    start, end = years[0], years[-1]
    return {"start": start, "end": end, "active_years": end - start}


def heuristic_parse(text: str) -> dict:
    years = extract_years(text)
    disciplines = detect_disciplines(text)
    goals = detect_goals(text)
    education = extract_education(text)
    awards = extract_awards(text)
    career_span = extract_career_span(years)

    # Rough career stage heuristic
    active_years = career_span.get("active_years") or 0
    if active_years < 5:
        career_stage = "Emerging"
    elif active_years < 15:
        career_stage = "Mid-Career"
    else:
        career_stage = "Established"

    return {
        "disciplines": disciplines,
        "primary_discipline": disciplines[0] if disciplines else "Unclassified",
        "artistic_goals": goals,
        "education": education,
        "career_span": career_span,
        "career_stage": career_stage,
        "notable_awards": awards,
        "parse_method": "heuristic",
    }


# ---------------------------------------------------------------------------
# LLM-Enhanced Parsing (Claude API)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an expert grant consultant specializing in artist profiles.
Analyze the provided CV text and extract a structured profile. Return ONLY valid JSON — no markdown, no prose.

The JSON must follow this exact schema:
{
  "name": "Artist full name or null",
  "disciplines": ["list of artistic disciplines"],
  "primary_discipline": "single most prominent discipline",
  "career_stage": "Emerging | Mid-Career | Established",
  "career_span": {
    "start": <earliest year as integer or null>,
    "end": <most recent year as integer or null>,
    "active_years": <integer or null>
  },
  "artistic_goals": [
    "Short, plain-English description of each thematic goal or artistic intention"
  ],
  "themes": ["key thematic concerns, e.g. 'memory', 'identity', 'ecology'"],
  "grant_keywords": [
    "3-8 keywords optimized for grant eligibility matching, e.g. 'community engagement', 'underserved youth'"
  ],
  "education": ["degree and institution pairs"],
  "notable_awards": ["up to 10 awards, grants, or fellowships"],
  "statement_excerpt": "A 1-2 sentence summary of the artist's mission in their own words, or null",
  "parse_method": "llm"
}"""


def llm_parse(text: str, model: str = "claude-sonnet-4-6") -> dict:
    """Send CV text to Claude and return the structured profile."""
    try:
        import anthropic
    except ImportError:
        sys.exit(
            "Error: 'anthropic' SDK is required for LLM parsing. "
            "Install it with: pip install anthropic"
        )

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit(
            "Error: ANTHROPIC_API_KEY environment variable is not set. "
            "Export it or use --no-llm for heuristic-only mode."
        )

    client = anthropic.Anthropic(api_key=api_key)

    # Truncate very long CVs to stay within token limits
    max_chars = 12_000
    cv_excerpt = text[:max_chars]
    if len(text) > max_chars:
        cv_excerpt += "\n\n[CV truncated for length]"

    message = client.messages.create(
        model=model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Here is the artist's CV:\n\n{cv_excerpt}",
            }
        ],
    )

    raw = message.content[0].text.strip()

    # Strip accidental markdown code fences
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    return json.loads(raw)


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------

def build_profile(cv_path: str, use_llm: bool, model: str) -> dict:
    text = extract_text(cv_path)

    if use_llm:
        try:
            profile = llm_parse(text, model=model)
        except json.JSONDecodeError as exc:
            print(f"Warning: LLM returned invalid JSON ({exc}). Falling back to heuristic parser.", file=sys.stderr)
            profile = heuristic_parse(text)
        except Exception as exc:
            print(f"Warning: LLM parsing failed ({exc}). Falling back to heuristic parser.", file=sys.stderr)
            profile = heuristic_parse(text)
    else:
        profile = heuristic_parse(text)

    profile["source_file"] = str(Path(cv_path).resolve())
    return profile


def main():
    parser = argparse.ArgumentParser(
        description="Parse an artist CV into a structured JSON profile.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--cv", required=True, help="Path to the artist's CV (.pdf or .txt)")
    parser.add_argument("--output", default=None, help="Write JSON to this file (default: print to stdout)")
    parser.add_argument("--no-llm", action="store_true", help="Use heuristic parsing only (no API call)")
    parser.add_argument("--model", default="claude-sonnet-4-6", help="Claude model ID (default: claude-sonnet-4-6)")
    parser.add_argument("--pretty", action="store_true", default=True, help="Pretty-print JSON (default: on)")
    args = parser.parse_args()

    use_llm = not args.no_llm
    profile = build_profile(args.cv, use_llm=use_llm, model=args.model)

    indent = 2 if args.pretty else None
    output_json = json.dumps(profile, indent=indent, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output_json, encoding="utf-8")
        print(f"Profile written to: {args.output}")
    else:
        print(output_json)


if __name__ == "__main__":
    main()

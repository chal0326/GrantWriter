"""
Tests for the heuristic layer of parse_artist_profile.py.
Run with: pytest tests/test_parse_artist_profile.py -v
"""

import json
import sys
from pathlib import Path

import pytest

# Make the scripts package importable regardless of working directory
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from parse_artist_profile import (
    detect_disciplines,
    detect_goals,
    extract_career_span,
    extract_education,
    extract_text,
    extract_years,
    heuristic_parse,
)

SAMPLE_CV = Path(__file__).parent.parent / "sample_data" / "sample_cv.txt"


# ---------------------------------------------------------------------------
# Unit tests — individual extractors
# ---------------------------------------------------------------------------

def test_detect_disciplines_visual_art():
    assert "Visual Art" in detect_disciplines("She is a painter and muralist based in Brooklyn.")


def test_detect_disciplines_multiple():
    text = "filmmaker and poet who also works in photography"
    disciplines = detect_disciplines(text)
    assert "Film & Video" in disciplines
    assert "Literary Arts" in disciplines
    assert "Visual Art" in disciplines  # photographer -> Visual Art


def test_detect_disciplines_unknown_returns_unclassified():
    assert detect_disciplines("accountant with 20 years in finance") == ["Unclassified"]


def test_detect_goals_community():
    goals = detect_goals("focuses on community outreach with underserved youth")
    assert "community_engagement" in goals


def test_detect_goals_social_justice():
    goals = detect_goals("explores racial equity and gender justice through her practice")
    assert "social_justice" in goals


def test_detect_goals_empty_text():
    assert detect_goals("abstract color field painting") == []


def test_extract_years():
    text = "Born 1985. MFA 2012. Solo show 2019 and 2023."
    years = extract_years(text)
    assert years == [1985, 2012, 2019, 2023]


def test_extract_years_deduplicates():
    text = "2018 residency. Group show 2018. Award 2018."
    assert extract_years(text) == [2018]


def test_extract_education():
    text = "MFA from Yale, BFA from RISD. Also holds an MA in Art History."
    degrees = extract_education(text)
    assert "MFA" in degrees
    assert "BFA" in degrees
    assert "MA" in degrees


def test_extract_career_span():
    span = extract_career_span([2005, 2010, 2018, 2023])
    assert span["start"] == 2005
    assert span["end"] == 2023
    assert span["active_years"] == 18


def test_extract_career_span_empty():
    span = extract_career_span([])
    assert span == {"start": None, "end": None, "active_years": None}


# ---------------------------------------------------------------------------
# Integration test — full heuristic parse on sample CV
# ---------------------------------------------------------------------------

def test_heuristic_parse_sample_cv():
    text = SAMPLE_CV.read_text(encoding="utf-8")
    profile = heuristic_parse(text)

    assert isinstance(profile, dict)
    assert "disciplines" in profile
    assert "artistic_goals" in profile
    assert "career_stage" in profile
    assert "career_span" in profile
    assert "education" in profile
    assert "notable_awards" in profile
    assert profile["parse_method"] == "heuristic"


def test_sample_cv_detects_visual_art():
    text = SAMPLE_CV.read_text(encoding="utf-8")
    profile = heuristic_parse(text)
    assert "Visual Art" in profile["disciplines"]


def test_sample_cv_detects_community_goal():
    text = SAMPLE_CV.read_text(encoding="utf-8")
    profile = heuristic_parse(text)
    assert "community_engagement" in profile["artistic_goals"]


def test_sample_cv_detects_education():
    text = SAMPLE_CV.read_text(encoding="utf-8")
    profile = heuristic_parse(text)
    assert "MFA" in profile["education"]
    assert "BFA" in profile["education"]


def test_sample_cv_career_stage():
    text = SAMPLE_CV.read_text(encoding="utf-8")
    profile = heuristic_parse(text)
    # CV spans 2009-2024 = 15 years → Established
    assert profile["career_stage"] in ("Mid-Career", "Established")


def test_sample_cv_awards_populated():
    text = SAMPLE_CV.read_text(encoding="utf-8")
    profile = heuristic_parse(text)
    assert len(profile["notable_awards"]) > 0


# ---------------------------------------------------------------------------
# Output format test
# ---------------------------------------------------------------------------

def test_profile_is_json_serializable():
    text = SAMPLE_CV.read_text(encoding="utf-8")
    profile = heuristic_parse(text)
    # Should not raise
    serialized = json.dumps(profile)
    assert isinstance(serialized, str)


def test_extract_text_txt_file():
    text = extract_text(str(SAMPLE_CV))
    assert "MFA" in text
    assert "painter" in text.lower()

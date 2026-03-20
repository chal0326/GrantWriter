# Claude Code: AI Grant Writer Architect

## Project Vision
An automated agent capable of identifying, drafting, and managing the end-to-end lifecycle of artist grants (specifically targeting NEA, NYFA, and private foundations).

## Technical Stack
- **Language:** Python 3.11+ (for data processing and LLM orchestration)
- **Framework:** LangGraph or CrewAI (for multi-agent workflows)
- **Database:** Supabase/PostgreSQL (to track deadlines and "Target" profiles)
- **Search:** Tavily API or Serper (for real-time grant discovery)

## Development Rules
- **Modular Design:** Separate the "Researcher" agent from the "Narrative Architect."
- **Data Privacy:** Never hardcode "Target" (artist) PII; use environment variables or a secure database.
- **Tone:** Proposals must be professional, evocative, and aligned with grantor missions (e.g., DEI initiatives for NYFA).

## Common Commands
- `python scripts/find_grants.py --target "Visual Artist"`: Run discovery.
- `python scripts/draft_narrative.py --grant "NYFA-2026"`: Start drafting.
- `pytest`: Run tests for budget calculation logic.

# SAFE-RAG Verification API (backend)

A FastAPI service implementing the hallucination-detection / fact-verification
pipeline for the SAFE-RAG frontend. It decomposes an LLM answer into claims
and classifies each one against a source context as **Supported**,
**Contradicted**, or **Abstain**, using the same idea as the reference repo
([LeNguyenAnhKhoa/Hallucination-Detection](https://github.com/LeNguyenAnhKhoa/Hallucination-Detection)):
prompt an LLM (here, Gemini) with the claim + context and a fixed label set
(Entailment/Contradiction/Unverifiable → Supported/Contradicted/Abstain here).

If no `GEMINI_API_KEY` is set, or a call fails, each claim is scored by a
deterministic rule-based fallback (numeric/date/entity overlap checks) so the
API still works end-to-end without any external dependency — useful for a
live demo with no internet or a rate-limited key.

## Setup

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# then edit .env and paste your GEMINI_API_KEY
# (free key: https://aistudio.google.com/apikey)
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API root: http://localhost:8000
- Interactive docs (Swagger UI): http://localhost:8000/docs
- Health check: http://localhost:8000/v1/health

The frontend (`npm run dev` in the repo root) expects this server at
`http://localhost:8000` by default — see `NEXT_PUBLIC_API_URL` in the root
`.env.local`.

## Endpoints

| Method | Path                       | Purpose                                             |
| ------ | --------------------------- | ---------------------------------------------------- |
| POST   | `/v1/verify`                | Verify a single `{context, answer}` pair             |
| GET/PUT| `/v1/settings`              | Read/update the Supported↔Abstain↔Contradicted risk thresholds |
| GET    | `/v1/api-keys`              | List API keys (preview only)                        |
| POST   | `/v1/api-keys`               | Create a new API key                                |
| POST   | `/v1/api-keys/{id}/roll`     | Rotate a key's secret                                |
| POST   | `/v1/api-keys/{id}/revoke`   | Revoke a key                                         |
| POST   | `/v1/api-keys/bootstrap`     | Get-or-create the first active key (used by the frontend on first load) |
| GET    | `/v1/analytics/summary`      | Aggregate stats + recent runs, built from real usage |
| GET    | `/v1/analytics/timeseries`   | Daily hallucination rate                             |
| GET    | `/v1/analytics/models`       | Per-model Supported/Contradicted/Abstain rates       |

All endpoints except the `/v1/api-keys*` management routes require
`Authorization: Bearer <key>` (set `REQUIRE_API_KEY=false` in `.env` to
disable this for quick local testing).

## Data & persistence

There's no database — API keys, threshold settings, and the verification
history log are each a small JSON file under `backend/data/`. That's
intentional for a course demo: it's fully inspectable and needs zero setup,
but isn't meant for production use (see `app/security.py` for notes on what
a real deployment would need instead — hashed keys, a real DB, session auth
for the key-management endpoints, etc).

## Notes on the classification approach

- **Claim decomposition** (`app/services/claims.py`): naive sentence
  splitting. A real system (like decomposing into atomic sub-claims via an
  LLM) would catch more, but this is enough to demo per-sentence verdicts.
- **Gemini classifier** (`app/services/gemini_client.py`): one call per
  claim, asking for a strict JSON `{risk_score, error_type, evidence}`.
- **Rule-based fallback** (`app/services/rules.py`): regex-based number,
  date, and named-entity overlap checks — a safety net, not a substitute for
  the LLM classifier.
- **Verdict thresholds** (`app/services/verifier.py`): the LLM/fallback only
  produces a 0–100 risk score; the Supported/Contradicted/Abstain cutoffs
  come from `/v1/settings`, so the Settings page sliders in the frontend
  directly change live classification behavior.

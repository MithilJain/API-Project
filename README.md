# SAFE-RAG — Hallucination Detection & Fact Verification

A full-stack demo for verifying LLM outputs against a source context:
decomposes an answer into claims and classifies each as **Supported**,
**Contradicted**, or **Abstain**, with a risk score, evidence, and error
type (numerical/entity/temporal/formatting mismatch, or unverifiable).

- **Frontend**: Next.js (this directory) — Dashboard, Verification Studio,
  Analytics, Developer API keys, Settings.
- **Backend**: FastAPI (`backend/`) — real REST API backed by Gemini for
  claim classification, with a deterministic rule-based fallback. See
  [`backend/README.md`](backend/README.md) for how the pipeline works.

Approach follows the same idea as the reference repo
([LeNguyenAnhKhoa/Hallucination-Detection](https://github.com/LeNguyenAnhKhoa/Hallucination-Detection)):
prompt an LLM with the claim + its source context and a fixed
Entailment/Contradiction/Unverifiable-style label set.

## Run it (two terminals)

**1. Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # then paste your GEMINI_API_KEY (optional — see below)
uvicorn app.main:app --reload --port 8000
```

**2. Frontend**

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first load it auto-provisions an API key
against the backend (`/v1/api-keys/bootstrap`) and stores it in
`localStorage` — no manual setup needed. Manage/rotate/revoke keys from the
"Developer API" page.

### Without a Gemini key

The backend works with **no API key at all**: every claim falls back to a
deterministic rule-based classifier (numeric/date/entity mismatch
detection). Get a free Gemini key at https://aistudio.google.com/apikey to
switch to real LLM-based classification — see `backend/.env.example`.

## Try it

- **Verification Studio** (`/studio`): paste a context + an LLM answer,
  click "Run SAFE-RAG Verification".
- **Settings** (`/settings`): drag the risk thresholds — this changes live
  classification behavior immediately.
- **Analytics** / **Dashboard**: fill in from real usage as you run the
  Studio above.

## Original Next.js scaffold

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

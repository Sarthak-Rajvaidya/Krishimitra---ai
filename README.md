# KrishiSetu AI — agricultural commerce + AI advisory prototype

Configurable brand (`BRAND_NAME`, `VITE_BRAND_NAME`). Public-demo MVP: storefront, cart/checkout, inventory, role dashboards
(Farmer, Admin, Finance, Developer, Founder), a PyTorch Crop Doctor pipeline, a RAG advisory with Groq → Mistral → Gemini
fallback, and an explainable recommendation engine.

> ## ⚠️ Verification status — read first
> This code was written in a sandbox that **could not install packages (PyPI/npm blocked)**. It was therefore **never run
> end-to-end**: the backend test suite, the frontend build, Alembic and the ML scripts have **not been executed**.
> What *was* executed: Python syntax checks on every backend/test/ML file, the LLM-fallback router tests (9/9 pass, with a stubbed
> config) and the RAG chunker. **Expect a few small bugs on first run.** Section 9 gives the exact commands to find and fix them;
> start with `pytest`.

## 1. Architecture
```
frontend/  React+Vite+TS+Tailwind (cookie session; no secrets)      backend/app/
  pages/ components/ hooks/ services/ layouts/                         api/v1/      routers (auth, catalog, shop, admin, finance,
backend/                                                                            founder, crop, advisory, system)
  FastAPI + SQLAlchemy 2 + Alembic                                     core/        config, security, audit, storage, logging
  PostgreSQL (transactions) · Qdrant (vectors)                         models/      users, catalog, orders, finance, ai, ops
ml/  prepare_dataset · training · evaluation/register_model            services/    pricing (paise/GST), checkout (stock, ledger)
knowledge_base/ (empty; add authorised docs)                           analytics/   metric definitions + aggregates
tests/ (pytest, SQLite + in-memory vector store, mocked LLMs)          ai/          llm/ rag/ crop_doctor/ recommendations/
```
Key decisions: money is integer paise; prices are GST-inclusive; order totals are always recomputed server-side;
stock is decremented with a conditional `UPDATE … WHERE on_hand-reserved >= qty` (no negative stock, race-safe) in one
transaction with the order, payment record, inventory transaction and ledger entries; `Idempotency-Key` prevents duplicate orders;
roles/permissions live in the DB and are enforced per endpoint (deny by default).

## 2. Prerequisites
Python 3.12, Node 20+, Docker (for PostgreSQL + Qdrant). `pip` access to PyPI and `npm` access to the npm registry.

## 3. Setup
```bash
cp .env.example .env            # set SECRET_KEY (openssl rand -hex 32); optionally DEMO_PASSWORD and LLM keys
docker compose up -d            # PostgreSQL 16 + Qdrant
cd backend && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # add: pip install -r requirements-ml.txt  (torch etc., for Crop Doctor / ST embeddings)
alembic upgrade head            # baseline schema
python -m app.seed              # demo users, 13 sample SKUs, ~60 days of demo orders/ledger/expenses; prints the demo password
uvicorn app.main:app --reload   # API on :8000, Swagger at /docs
# new terminal
cd frontend && npm install && npm run dev     # http://localhost:5173 (proxies /api to :8000)
```
Demo logins (password printed by the seed command): `farmer@ / admin@ / finance@ / developer@ / founder@ demo.local`
(+ `farmer1..6@demo.local`). Reset demo data: `python -m app.seed --reset` (**drops all tables**; refuses when `APP_ENV=production`).

Without Qdrant/sentence-transformers you can still explore everything except advisory retrieval; for a fully offline dev run set
`EMBEDDING_BACKEND=hash` (lexical, not semantic).

## 4. Roles → access
| Role | Can | Cannot |
|---|---|---|
| FARMER | shop, own cart/orders/addresses, Crop Doctor, Advisory | anything staff |
| ADMIN | catalogue, inventory, orders, customers, promos, role changes (not own), audit view, ops reports | finance ledger/exports, model/flag changes |
| FINANCE | finance overview/ledger/GST/refunds/recon/exports, record expenses | edit orders, roles, models, flags |
| DEVELOPER | health, models, flags, knowledge upload/ingestion, sanitized logs, audit | customer data, finance, orders |
| FOUNDER | executive overview, finance **view**, system view; sensitive export is separately permissioned **and audited** | writes of any kind |

## 5. Metric definitions (also in `app/analytics/metrics.py`)
- **Net sales** = SALE − DISCOUNT − REFUND ledger entries (ex-GST, after discounts/reversals). **Gross order value** = Σ order totals (incl. GST + delivery), non-cancelled.
- **COGS** = COGS − COGS_REVERSAL (unit cost snapshotted on each order line). **Gross profit** = net sales − COGS; **margin** = GP / net sales.
- **Operating profit** = gross profit − *recorded* expenses only; the UI lists which expense categories were included. Unavailable values show "Unavailable", never an estimate.
- **GST** = tax contained in GST-inclusive prices (half-up per line, scaled for discounts). An operational estimate, **not a GST return**.
- **Repeat customer** = ≥ 2 non-cancelled orders in range. **Slow-moving** = in stock, zero sales in range. **Stockout risk** = < 7 days of cover at the range's sales rate.
- Revenue is recognised at order placement and reversed on cancellation (demo simplification). The ledger is append-only; fixes are reversing entries.

## 6. Crop Doctor training
```bash
# 1. Read the dataset card (licence, attribution, classes). Record it:
cp ml/data/DATASET_NOTES.md.template ml/data/DATASET_NOTES.md   # fill in; training refuses without it
# 2. Prepare a small subset (NOT done at API startup)
python ml/scripts/prepare_dataset.py --hf-id <owner/plantvillage-dataset> --out ml/data/raw/plantvillage \
   --classes "Tomato___Early_blight,Tomato___Late_blight,Tomato___healthy" --max-per-class 600
# 3. Train (MobileNetV3-small, seeded, stratified split, per-class P/R/F1 + confusion matrix)
python ml/training/train.py --data-dir ml/data/raw/plantvillage --epochs 8 --version 0.1.0
# 4. Register + activate in the app DB, then the API serves real predictions
cd backend && python ../ml/evaluation/register_model.py --artifacts ../ml/artifacts --activate
```
Until trained, the app says so and **does not fabricate predictions**. Reported accuracy is on lab-style images and will overstate field accuracy;
PlantVillage near-duplicates can leak across a random split — use `--group-regex` if your copy exposes source-image ids.
Verify the exact class names on the dataset card; the script lists available names if yours differ.

## 7. Advisory / RAG
Developer console → *RAG Documents*: upload PDF/TXT/MD with source, **licence** and **authoriser** (mandatory). Pipeline: extract → normalise →
chunk (page + section kept) → embed (multilingual MiniLM, Marathi+English) → Qdrant → retrieve → relevance gate (`RAG_MIN_SCORE`) → grounded prompt
→ LLM → citation validation (markers not matching a retrieved passage are stripped; uncited answers are flagged). No evidence ⇒ an explicit
"verified evidence not found" reply without calling the LLM. Retrieved text is treated as untrusted data in the prompt.
LLM order comes from `LLM_PROVIDER_ORDER`; per-provider timeout, ≤`LLM_MAX_RETRIES` retries **only** for retryable errors (timeouts/429/5xx), cooldown
circuit-breaker, latency/outcome logged without prompts or keys. Model IDs are env-configured — confirm they are still available from each vendor.

## 8. Recommendations (separate from sales)
A product is "supported" only if **all** hold: verified label metadata lists the crop and target, retrieved evidence exists, and (for nutrients) a soil/tissue
test route is followed. Everything else is returned as *not suggested* with a reason. Ordering is alphabetical; price/margin/stock never affect rank.
No doses are produced. Demo products ship with **unverified** labels, so by design nothing is "supported" until you add verified label data.
Order linkage to advisory is stored only if the farmer ticks the consent box at checkout.

## 9. Testing
```bash
pytest                                  # from repo root: RBAC matrix, checkout/stock/concurrency, ledger identities, LLM fallback, RAG, uploads
cd frontend && npm test && npm run build
```
Concurrency test: exact "3 of 8 succeed" is only guaranteed on PostgreSQL; on SQLite it asserts the no-oversell invariant.
**Manual public-demo checklist**: (1) farmer login → browse/search → add to cart → checkout COD → stock drops; (2) admin confirms → packs → delivers; cancel restocks;
(3) finance exports ledger CSV; (4) developer sees provider/model/vector health, toggles a flag (audited); (5) founder overview + date ranges; (6) Crop Doctor shows the
"no trained model" state (or real predictions after training); (7) upload a doc, ask a question → cited answer; ask something unrelated → "evidence not found";
(8) unset all LLM keys → polite "temporarily unavailable"; (9) farmer B cannot open farmer A's order (404).

## 10. Deployment notes
Set `APP_ENV=production`, strong `SECRET_KEY`, `COOKIE_SECURE=true`, exact `CORS_ORIGINS`, managed PostgreSQL/Qdrant, HTTPS in front, and no `--reload`.
Replace `LocalStorage` with an object-store adapter (same `save/read` interface in `core/storage.py`). Rate limiting is in-process (per-instance): use a shared
store/API gateway for multi-instance. Never run `app.seed` against real data.

## 11. Limitations / must replace before real launch
- **Not run end-to-end** in the build environment (see top). Treat as a strong scaffold needing a debugging pass.
- All catalogue prices, stock, orders, finances, diagnoses and chats are **fictional demo data** (`is_demo`). Product label/compliance data is empty/unverified; no pesticide approvals, doses or label claims are included.
- **No payment gateway**: COD + clearly labelled simulated payment only. No real settlement, no invoices that are legally GST invoices, no tax filing/compliance.
- Crop Doctor has **no trained weights** shipped; PlantVillage-trained models don't generalise to field photos; softmax scores are uncalibrated.
- Knowledge base ships **empty**; a lexical `hash` embedder exists only for dev/tests.
- Auth is basic (email+password, JWT cookie, no email verification, MFA, password reset, account lockout). In-process rate limiter. Tokens aren't revocable server-side.
- Single central warehouse; pincode serviceability table is demo-seeded; delivery fee rules are simplistic. No returns workflow beyond cancel/refund records.
- Reports compute in Python/SQL per request (fine for demo scale); add caching/materialised views at scale. Marathi UI strings are limited to suggested questions; full i18n is future work.
- Alembic baseline creates tables from metadata; generate real incremental migrations from here. Frontend uses no product imagery (no unlicensed images).
- Security review still needed: dependency pinning/audit, CSRF strategy if cross-site cookies are ever used, upload scanning, secrets management, pen-test.

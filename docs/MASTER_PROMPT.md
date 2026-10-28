# MASTER BUILD PROMPT — AI-POWERED AGRICULTURAL COMMERCE PLATFORM

Act as a senior full-stack engineer, AI/ML engineer, UI/UX designer, database architect, and security engineer. Build a complete, polished, runnable full-stack prototype for an Indian agricultural startup.

The working name is **KrishiSetu AI**. Make the branding configurable so it can be renamed later.

This is a public-demonstration MVP, not just a Figma design or static frontend. The frontend, API, database, authentication, shopping flow, dashboards, AI interfaces, and sample data must work together.

## 1. Product vision

Build a platform that combines:

1. A fast agricultural-input shopping experience inspired by the simplicity of Zepto, Blinkit, and Amazon.
2. A deep-learning-based Crop Doctor that analyzes crop images.
3. A RAG-based agricultural advisory chatbot.
4. A central warehouse inventory and order-management system.
5. Role-specific dashboards for the farmer, administrator, finance head, developer, and founder.
6. Business intelligence covering sales, inventory, profitability, customer growth, and AI usage.

The core user journey should be:

Farmer uploads crop photo → AI produces a preliminary assessment → RAG retrieves relevant agricultural evidence → platform presents explainable options → farmer checks availability and prices → adds a suitable product to cart → places order → admin processes it → the farmer can follow up on the advisory.

Do not simply copy an existing marketplace. Emphasize explainable recommendations, transparent prices, stock-aware suggestions, traceable advice, and feedback about agricultural outcomes.

## 2. Mandatory technology stack

Frontend:
- React with Vite.
- TypeScript.
- Tailwind CSS.
- React Router.
- Recharts for charts.
- Lucide React for icons.
- React Hook Form and Zod where appropriate.

Backend:
- Python 3.12.
- FastAPI.
- Pydantic.
- SQLAlchemy 2.
- Alembic database migrations.
- Pytest.

Database and retrieval:
- PostgreSQL for transactional and application data.
- Qdrant for vector retrieval.
- A reliable embedding model with documented configuration.
- PostgreSQL-backed chat history and audit records.

AI:
- PyTorch for image classification.
- Transfer learning using MobileNetV3 or EfficientNet.
- Groq as the primary LLM provider.
- Mistral as the first fallback.
- Gemini as the second fallback.
- A provider abstraction so the LLM can be changed without rewriting application logic.

Infrastructure:
- Environment variables and .env.example.
- Docker Compose for local development, including PostgreSQL and Qdrant.
- Local image-storage adapter for development, with an interface for later object-storage integration.
- Structured logging and health checks.

Do not place secrets, database credentials, or LLM API keys in frontend code.

## 3. Visual design requirements

Create a premium, trustworthy agricultural brand.

Use:
- Forest green, fresh leaf green, warm off-white, and restrained amber accents.
- Clean typography and consistent spacing.
- Responsive layouts for desktop, tablet, and mobile.
- Attractive product cards with real or appropriately licensed product imagery.
- Sidebar navigation for staff dashboards.
- A mobile-friendly storefront with a compact header, search, categories, cart indicator, and clear navigation.
- Charts, KPI cards, empty states, skeleton loaders, validation messages, and toast notifications.
- Accessible contrast, keyboard navigation, labels, and visible focus states.

The storefront should feel as easy to use as a quick-commerce app. Staff dashboards should look like a professional business application.

Use a configurable logo and brand name. Never use competitor logos or imply affiliation with them.

Avoid generic AI-generated marketing text, oversized empty hero sections, excessive gradients, and non-functional buttons.

## 4. Authentication and permissions

Implement authentication and backend-enforced role-based access control.

Roles:
1. FARMER
2. ADMIN
3. FINANCE
4. DEVELOPER
5. FOUNDER

Use secure password hashing, login, logout, user identity, protected routes, session expiration, and suitable secure cookie or token handling. Never trust a role supplied by the client.

Create a demo seeding command that generates separate demo accounts for each role. Use documented local-only demo credentials from environment configuration or generated output; never hardcode production passwords.

Permission requirements:

FARMER:
- Shop and search products.
- Manage own cart, addresses, and orders.
- Use Crop Doctor and Advisory.
- View own diagnoses, chats, order history, and invoices.
- Submit reviews and follow-up crop observations.

ADMIN:
- Manage product catalogue, categories, pricing, inventory, promotions, and orders.
- Manage customer accounts and delivery status.
- View business reports and operational analytics.
- Manage user roles only through explicitly authorized endpoints.
- View audit records for relevant administrative operations.

FINANCE:
- View sales, revenue, discounts, refunds, costs, margins, expenses, and payment reconciliation.
- View GST-related reports and export accounting data.
- Cannot alter model settings, grant roles, or edit orders and transactions arbitrarily.
- Use a proper financial ledger and immutable transaction records.

DEVELOPER:
- View service health, API status, model versions, evaluation results, RAG ingestion jobs, feature flags, and sanitized logs.
- Add and manage approved feature configurations and development metadata.
- Manage model deployments only through authorized, audited workflows.
- Must not automatically receive unrestricted access to customer personal data, payment details, or financial reports.
- Do not expose arbitrary shell execution or unrestricted production database access through the dashboard.

FOUNDER:
- Executive overview of the entire business.
- Revenue and profitability, sales trends, inventory risk, customer growth, regional demand, order fulfilment, AI usage, and system performance.
- Access to sensitive reports only through explicit permissions and audit logging.
- Can be assigned a separate executive permission bundle rather than receiving blanket access to every sensitive record.

The API must enforce every permission independently of frontend navigation. Deny access by default.

## 5. Farmer storefront and navigation

Build these pages:

- Home
- Shop All
- Fertilizers
- Crop Protection
- Seeds
- Micronutrients
- Equipment and Accessories
- Product Details
- Search Results
- AI Crop Doctor
- Krishi Advisory
- My Farm
- My Diagnoses
- My Orders
- Order Details and Tracking
- Cart
- Checkout
- Saved Addresses
- Profile and Settings
- Help and Support

Storefront requirements:
- Search by product name, category, crop, and supported use.
- Filter by category, price, availability, and relevant attributes.
- Sort by price and relevance.
- Show product name, pack size, price, sample or actual stock status, product type, description, and applicable safety information.
- Show clear price per pack and unit price where useful.
- Use database-driven product data, not arrays hardcoded into UI components.
- Cart quantity updates, removal, subtotal, discounts, delivery charges, and total calculation.
- Recalculate all amounts on the server.
- Validate inventory during checkout and reserve/decrement stock transactionally.
- Generate a unique order number.
- Support COD and a clearly labelled simulated online payment mode in the demo. Do not collect real card credentials or claim a payment succeeded when it did not.
- Show order history, invoice, order status, and delivery timeline.
- Include a location or pincode input for the prototype, but do not promise delivery where no serviceability rules exist.

Use a central warehouse model for the first version. Keep the schema extensible for multiple hubs later.

## 6. Sample catalogue and inventory

Create at least 12 realistic sample SKUs across:
- Fertilizers.
- Micronutrients.
- Crop-protection products.
- Seeds.
- Agricultural accessories.

Examples of catalogue placeholders:
- Urea 45 kg.
- NPK 19:19:19.
- DAP 50 kg.
- Water-soluble NPK fertilizer.
- Zinc sulphate.
- Ferrous sulphate.
- Boron micronutrient.
- Two fungicide sample products.
- Two insecticide sample products.
- One seed product.
- One spraying accessory.

Important:
- Clearly label fictional demo prices and stock as sample data.
- Do not fabricate official product approvals, brands, pesticide label claims, or recommended doses.
- Separate catalogue seed data from production inventory.
- Use actual startup products, prices, pack sizes, and verified labels when supplied later.
- Make the product catalogue easy to replace using an import CSV or admin upload.

## 7. Admin dashboard

Navigation:
- Overview
- Products
- Categories
- Inventory
- Orders
- Customers
- Pricing
- Promotions
- Delivery Management
- Reviews
- Business Reports
- Users and Roles
- Audit Logs
- Settings

Dashboard KPIs:
- Gross order value.
- Net sales.
- Number of orders.
- Average order value.
- Total products.
- Low-stock products.
- Pending orders.
- Delivered orders.
- Refund totals.
- Repeat customers.

Charts:
- Daily and monthly sales.
- Order status distribution.
- Category sales.
- Top-selling products.
- Inventory levels.
- Low-stock alerts.
- New versus repeat customers.

Operational functions:
- Add, edit, deactivate, and search products.
- Manage categories, descriptions, images, pack sizes, and sample pricing.
- Update stock through audited inventory transactions.
- Configure reorder thresholds.
- Process and cancel eligible orders.
- Manage promotions and product availability.
- View customer order history with appropriate permissions.
- Export relevant reports as CSV.

Use real aggregated API data. Do not hardcode chart values into dashboard components.

## 8. Founder executive dashboard

Create a distinct executive overview with:

- Total net sales and sales growth.
- Gross profit and gross margin.
- Order volume and average order value.
- Customer acquisition and repeat-purchase rate.
- Top-performing product categories.
- Inventory valuation and slow-moving stock.
- Stockout and fulfilment risk.
- Cancellation and refund rates.
- Revenue by region when genuine region data exists.
- Crop issues reported through Crop Doctor.
- Advisory conversations and AI usage.
- LLM provider availability and inference latency.
- Model performance and low-confidence prediction rate.
- Recent business events and alerts.
- Downloadable CSV reports.

Date filters:
- Today.
- Last 7 days.
- Last 30 days.
- Last 90 days.
- Custom date range.

Implement the underlying calculations and document metric definitions.

Never use sales revenue as a substitute for profit. Show which expenses are included and mark unavailable data as unavailable rather than inventing figures.

Use seeded sample orders to make the demonstration visually meaningful, and clearly distinguish demo data from live business data.

## 9. Finance dashboard

Navigation:
- Financial Overview.
- Sales Ledger.
- Revenue.
- Cost of Goods Sold.
- Gross Profit and Margin.
- Expenses.
- Discounts.
- Refunds.
- Payment Reconciliation.
- GST Reports.
- Invoices.
- Financial Exports.

Requirements:
- Use paise or integer minor currency units for money calculations wherever practical.
- Maintain auditable financial transaction records.
- Separate order value, discounts, tax, delivery fees, refunds, cost of goods sold, and expenses.
- Define how GST and gross margin are calculated.
- Provide date filtering, CSV export, and summary charts.
- Do not fabricate actual tax filings or claim compliance certification.
- Use sample financial data for the demonstration.
- Keep financial write access restricted and audited.

## 10. Developer dashboard

Navigation:
- System Overview.
- API Health.
- Database Health.
- Vector Database Health.
- LLM Providers.
- Model Registry.
- Model Evaluation.
- RAG Documents.
- Ingestion Jobs.
- Feature Flags.
- Error Logs.
- Audit Logs.

Display:
- Service status.
- API latency.
- LLM provider latency and availability.
- Model version and last evaluation.
- Supported image classes.
- Dataset metadata and licence notes.
- RAG document count and ingestion status.
- Retrieval test results.
- Sanitized errors and failed jobs.

Allow authorized feature-flag configuration and model-version selection through safe, validated APIs. Record who changed each setting.

Never display secret keys. Never execute arbitrary shell commands from the UI.

## 11. Crop Doctor: genuine deep-learning integration

Do not build a fake diagnosis feature that always returns a predetermined result.

Create an independently testable image-classification service using PyTorch.

Dataset:
- Start with the PlantVillage dataset from the official Hugging Face dataset card or its linked repository.
- Review the dataset licence, attribution requirements, crop coverage, class mapping, and train/test methodology before use.
- Do not download the complete dataset during ordinary backend startup.
- Provide a separate dataset preparation and training workflow.
- Allow a smaller initial class subset for a manageable prototype.
- Keep training code, evaluation code, class labels, and model artefacts organized.

Model:
- Use transfer learning with MobileNetV3 or EfficientNet.
- Include preprocessing, training, validation, checkpoints, and inference.
- Use class-aware train/validation/test splits and avoid leakage.
- Report per-class precision, recall, F1 score, confusion matrix, and test accuracy.
- Include reproducible seeds and training configuration.
- Save the model weights and label mapping.
- Make inference callable through FastAPI.
- Include a model-unavailable state and an explicit untrained-model guard.

Image upload:
- Validate file type, size, and image decoding.
- Reject unsupported or malformed files.
- Store uploads safely without exposing internal filesystem paths.
- Support an image preview.
- Record the model version and prediction metadata.

Crop Doctor UI:
- Upload a crop image.
- Select crop, crop stage, affected plant part, and observed symptoms.
- Display the uploaded photo and prediction results.
- Show supported class probabilities and a confidence or uncertainty indicator.
- Allow the farmer to report whether the assessment looks correct.
- Save the diagnosis to the farmer's account.
- Allow follow-up observations and human expert review status.

If the model has not been trained, show an honest demo or model-unavailable state. Do not label mocked outputs as actual predictions.

## 12. Explainable agricultural recommendations

Implement a separate recommendation service that consumes:
- Model predictions.
- Crop type.
- Crop growth stage.
- User-reported symptoms.
- Location, if voluntarily provided.
- Retrieved agricultural documents.
- Verified product metadata and applicable label restrictions.
- Product availability and price.

For each recommendation candidate, provide:
- Suspected issue or intended purpose.
- Evidence supporting consideration.
- Evidence source and document citation.
- Why the option may be relevant.
- Important uncertainty or conflicting evidence.
- Label and crop restrictions.
- Available pack sizes and current price.
- Other appropriate options or non-chemical measures when supported by the evidence.
- Whether expert confirmation is required.

Explain why a candidate was included or excluded. Do not invent a numerical medical-style probability of diagnosis or a scientific efficacy score without a validated method.

Do not infer nutrient deficiencies reliably from a leaf photo alone. Request soil-test results or other evidence where appropriate.

Do not automatically prescribe a pesticide from an image prediction. Verify that any product recommendation is supported by authoritative, applicable crop-specific information. If diagnosis or applicability is uncertain, ask questions or refer the case to a qualified agronomist.

Never rank an unsuitable product above an appropriate one because of price or profit margin. Do not invent dosages, tank mixes, or pesticide instructions.

Keep recommendation logic separate from sales logic.

## 13. RAG-based Krishi Advisory

Build an actual retrieval-augmented generation pipeline. It must not be a generic chatbot that answers only from its pretrained knowledge.

Pipeline:
1. Upload an authorized document.
2. Extract text from PDF, TXT, and supported document formats.
3. Normalize and chunk content.
4. Attach source metadata.
5. Generate embeddings.
6. Store vectors in Qdrant.
7. Retrieve relevant passages for a query.
8. Apply relevance checks and assemble source-grounded context.
9. Generate a response through the configured LLM provider.
10. Validate the response and present citations.

Initial knowledge base:
- General crop-care guides.
- Official crop-management documents.
- Verified disease and pest references.
- Soil and nutrient-management guidance.
- Authorized product labels and leaflets.
- Relevant official agricultural guidance for India.
- Selected public agricultural FAQs with documented sources.

Do not fabricate sources or claim that a source supports a statement it does not support.

Each response should include:
- A direct answer.
- Relevant evidence.
- Source title and available page or section.
- Uncertainty or missing information.
- Follow-up questions when necessary.

If no relevant document is retrieved, explicitly say that verified evidence was not found in the current knowledge base.

Chat features:
- Persistent conversations per farmer.
- New conversation and conversation history.
- Suggested questions.
- Follow-up questions using conversation context.
- Clear source citations.
- Helpful error handling.
- Feedback on answer usefulness.
- Optional Marathi and English interface, with the architecture ready for additional languages.

Create a separate admin/developer interface for document upload, ingestion status, metadata, failed jobs, and retrieval evaluation.

Only index documents the startup is authorized to use. Track provenance and licensing.

## 14. Groq, Mistral, and Gemini fallback

Implement a provider abstraction with:
- Groq as primary.
- Mistral as first fallback.
- Gemini as second fallback.

Use documented SDKs and supported API models. Read model identifiers and keys from environment variables. Do not assume a model name will always remain available.

Requirements:
- Provider-specific adapter interfaces.
- Timeouts and limited retries.
- Retry only on retryable failures.
- Circuit-breaker or cooldown behavior for unhealthy providers.
- Provider health monitoring.
- Safe logging without API keys or full sensitive prompts.
- Provider and latency metadata for observability.
- A clear message if all providers fail.
- Unit tests using mocked provider clients.
- No unnecessary repeated charges due to retry loops.

Keep retrieval independent of the provider. All providers must receive the same grounded context and applicable safety instructions.

Do not switch providers to bypass safety restrictions. Avoid logging sensitive farmer data unless necessary and explicitly designed.

## 15. Advisory-to-commerce connection

When an agricultural advisory identifies a possible need:
- Search the actual product catalogue.
- Check product availability.
- Check crop and label applicability.
- Display relevant product options.
- Explain the evidence supporting each option.
- Display the current database price.
- Allow a product to be added to the cart.
- Preserve the diagnosis/advisory reference in the order metadata when the user consents.

Do not force the farmer to buy anything to access advice.

Track:
- Diagnosis ID.
- Advisory conversation ID.
- Recommendation candidate IDs.
- Product viewed.
- Product added to cart.
- Order ID.
- Follow-up feedback.

Use this to evaluate the quality of the recommendation process, not merely to optimize sales.

## 16. Database schema

Create normalized SQLAlchemy models and migrations for at least:

- User.
- Role and Permission, or a clearly defined RBAC model.
- FarmerProfile.
- Address.
- Product.
- ProductCategory.
- ProductLabel and compliance metadata.
- InventoryLocation.
- InventoryBalance.
- InventoryTransaction.
- Cart.
- CartItem.
- Order.
- OrderItem.
- OrderStatusHistory.
- PaymentRecord.
- RefundRecord.
- FinancialTransaction.
- Expense.
- Promotion.
- Review.
- CropDiagnosis.
- DiagnosisPrediction.
- AdvisoryConversation.
- AdvisoryMessage.
- KnowledgeDocument.
- KnowledgeChunk metadata.
- IngestionJob.
- Recommendation.
- RecommendationFeedback.
- ModelVersion.
- ModelEvaluation.
- FeatureFlag.
- AuditLog.

Add appropriate indexes, uniqueness constraints, foreign keys, timestamps, and status enums.

Never store plaintext passwords. Never put full documents or large image binaries into ordinary relational fields when object storage is more appropriate.

Design the order checkout process to handle concurrent stock updates safely. Prevent negative stock and duplicate order creation.

Use soft deletion where appropriate for catalogue records and retain required audit history.

## 17. API design

Use versioned endpoints under /api/v1.

Create endpoints for:
- Authentication and current user.
- Products, categories, search, and filters.
- Cart operations.
- Checkout and orders.
- Inventory and admin product management.
- Customer and role administration.
- Finance reporting and exports.
- Founder analytics.
- Image upload and crop diagnosis.
- Agricultural recommendations.
- RAG chat and conversation history.
- Knowledge-document ingestion.
- Model evaluation and versions.
- System health and sanitized operational logs.
- Feature flags and audit logs.

Use typed Pydantic request and response schemas, pagination, validation, consistent error responses, and server-side permission checks.

Document the API in FastAPI's OpenAPI/Swagger UI.

## 18. Reports and business intelligence

Implement dashboard aggregates on the backend. Use date filters and well-defined metric calculations.

Charts should cover:
- Sales over time.
- Orders by status.
- Product and category performance.
- Gross profit and margin.
- Customer retention.
- Inventory movement.
- Stockout risk.
- Refunds and cancellations.
- Crop issue frequency.
- Advisory usage.
- Model evaluation and prediction uncertainty.
- LLM provider latency and errors.

Use genuine seeded sample database records for the public demonstration. Do not make dashboard metrics depend on hardcoded arrays in React.

Clearly label sample data and demo-only projections.

## 19. Security and reliability

Implement:
- Password hashing.
- Authentication and backend authorization.
- Secure CORS configuration.
- Request validation.
- File upload limits.
- Rate limits on authentication and AI endpoints where practical.
- Protection against path traversal and unsafe file handling.
- Safe error messages.
- Environment-based configuration.
- Database migrations and transaction management.
- Audit logging for privileged actions.
- No secrets in source control.
- Data access isolation between farmers.
- Proper handling of personal data.
- Health and readiness endpoints.
- Automated tests for role permissions and checkout concurrency.

Treat uploaded documents and retrieved passages as untrusted content. A document must not be able to override system instructions or disclose secrets.

## 20. Seed data and demonstration mode

Create a reliable seed command that:
- Creates demo users for each role.
- Creates at least 12 products.
- Creates categories and sample inventory.
- Creates sample customers and orders.
- Creates realistic financial transactions.
- Creates sample crop diagnosis records and advisory conversations.
- Creates dashboard data across multiple dates.

Label all fictional records as demo data.

Do not fabricate real farmer testimonials, product efficacy, verified diagnoses, or live payment confirmations.

Provide a convenient local demo reset procedure.

## 21. Testing and evaluation

Provide:
- Backend unit tests.
- API integration tests.
- RBAC tests for every role.
- Checkout and inventory transaction tests.
- Finance metric tests.
- Mocked LLM fallback tests.
- RAG retrieval and citation tests.
- Image upload validation tests.
- Model evaluation scripts.
- Frontend smoke tests for key flows.
- A manual public-demo checklist.

Test at least these scenarios:
1. Farmer signs in and browses products.
2. Farmer adds an item to the cart and completes a demo checkout.
3. Stock is updated correctly.
4. Admin updates a product and processes an order.
5. Finance user views sales and exports a report.
6. Developer checks model and service health.
7. Founder views business analytics.
8. Farmer uploads an image and receives a genuine model prediction, or an honest unavailable state.
9. Advisory answers using retrieved evidence and citations.
10. Groq failure triggers Mistral and then Gemini as configured.
11. A farmer cannot access another farmer's orders.
12. An unauthorized role cannot access restricted finance or administrative APIs.

## 22. Required project structure

Organize the project cleanly, for example:

krishisetu-ai/
  frontend/
    src/
      components/
      layouts/
      pages/
      features/
      hooks/
      services/
      types/
  backend/
    app/
      api/
      core/
      models/
      schemas/
      repositories/
      services/
      ai/
        llm/
        rag/
        crop_doctor/
        recommendations/
      permissions/
      analytics/
      db/
  ml/
    data/
    scripts/
    training/
    evaluation/
    artifacts/
  knowledge_base/
    README.md
  tests/
  docker-compose.yml
  .env.example
  README.md

Adapt the structure where needed, but maintain separation of concerns. Do not commit private keys, large datasets, or unlicensed product imagery.

## 23. Build process

Work in this order:

Phase 1: Architecture, repository structure, database schema, environment setup, and demo seed data.

Phase 2: Authentication, roles, shared application layouts, and responsive storefront.

Phase 3: Product catalogue, cart, checkout, inventory, and order tracking.

Phase 4: Admin, finance, founder, and developer dashboards.

Phase 5: Deep-learning training pipeline, evaluation, saved weights, and inference API.

Phase 6: RAG ingestion, retrieval, citations, agricultural advisory, and LLM fallback.

Phase 7: Crop-to-cart integration, feedback, audit logs, and business analytics.

Phase 8: Testing, security review, bug fixes, and deployment documentation.

Do not skip backend integration and replace it with mock frontend state.

## 24. Deliverables

Produce:
1. Complete frontend source code.
2. Complete FastAPI backend.
3. Database models and migrations.
4. Demo seed scripts and sample catalogue.
5. A genuine training and evaluation pipeline.
6. RAG ingestion and retrieval implementation.
7. LLM provider adapters and fallback logic.
8. Automated tests.
9. Docker Compose setup.
10. .env.example.
11. A complete README with setup, training, database migration, seeding, running, testing, and deployment instructions.
12. A clear demo walkthrough for the founder and public review.
13. A list of limitations and what must be replaced before real-world launch.

## 25. How to work with me

I am an engineering student and the technical contributor to this startup. I need code that I can understand, run, test, and extend.

First inspect the existing repository and reuse any existing implementation that is sound. Do not overwrite working files blindly.

If no repository exists, scaffold the project.

Build in small, verifiable phases. Explain which files are being created, why they exist, the exact commands to run, and how to verify each phase. Do not move on when a foundational phase has not been tested.

If you have access to the project workspace and tools, create and modify the actual files instead of merely printing a huge response. If working in a text-only environment, provide complete files in manageable groups and keep track of what has been completed.

Do not stop after generating the homepage. Continue until the required modules, APIs, data models, integrations, and tests are implemented.

If external API keys are unavailable, build real provider adapters with configuration validation and mocked tests. Clearly distinguish a mock from a live provider.

If the full implementation cannot fit in one response, prioritize a runnable end-to-end MVP, maintain a progress checklist, and continue phase by phase.

Begin by inspecting the repository, then give me the architecture and implementation plan, and start building Phase 1.

The final result must be a functional, maintainable prototype that can be demonstrated to the startup founder, not just a UI concept.
# AI-POWERED REAL ESTATE COLLECTIONS PLATFORM
## Complete Project Guidelines & Engineering Instructions

---

# 1. PROJECT OVERVIEW

Build a scalable, multi-tenant SaaS platform that automates real estate payment collections using AI-powered voice agents, payment tracking, risk scoring and collection intelligence.

The platform is designed for real estate developers and builders who need to collect milestone-based instalments from homebuyers.

### Core business model

There are two primary parties:

**1. Builder / Real Estate Developer**
- The B2B customer who subscribes to and pays for the platform.
- Connects their CRM/ERP system.
- Views customer payment information.
- Monitors outstanding payments and collection performance.
- Configures collection strategies and communication preferences.
- Receives reports and insights through the dashboard.

**2. Homebuyer / Property Allottee**
- The person who has purchased or booked a property.
- Receives AI-powered calls from the platform on behalf of the builder.
- Is reminded about upcoming or overdue instalments.
- Can request payment links, confirm previous payments, raise disputes or request callbacks.

**Important:** The AI agent calls the homebuyer to collect payments on behalf of the builder. It never calls the builder to collect money.

### Core value proposition

Position this product as an:

**AI Collections Intelligence & Receivables Management Platform**

Do not build it as merely an automated calling application.

The platform should help builders:
- Improve payment collection rates.
- Reduce overdue receivables.
- Identify customers at risk of delayed payments.
- Automate repetitive collection follow-ups.
- Track payment promises.
- Reduce manual collection-team workload.
- Understand collection performance through analytics.

---

# 2. TECHNOLOGY STACK — LOCKED

Use the following technology stack consistently. Do not replace technologies without discussing the architectural reason first.

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Main Backend
- NestJS
- Node.js
- TypeScript

### Database
- PostgreSQL

### ORM and Database Migrations
- Prisma ORM
- Prisma Schema
- Prisma Migrate

### AI / Machine Learning Service
- Python
- FastAPI
- Scikit-learn
- XGBoost or LightGBM when appropriate

Python is reserved for specialised AI/ML workloads. NestJS remains the primary application backend and owner of the business database.

### AI and Voice
- LLM: Google Gemini
- Telephony: Twilio
- Speech-to-Text: Deepgram
- Text-to-Speech: Sarvam AI

### Cloud Infrastructure
Google Cloud Platform:
- Cloud Run
- Cloud SQL for PostgreSQL
- Cloud Tasks
- Cloud Scheduler
- Cloud Storage
- Secret Manager
- Cloud Logging
- Cloud Monitoring
- Cloud Build
- Artifact Registry

Prefer Mumbai region `asia-south1` where the required services and capabilities are supported.

### Development and Testing
- VS Code
- GitHub
- Postman
- Docker
- Gemini / Google AI Studio for model experimentation

Do not introduce AWS or Azure into the MVP infrastructure.

---

# 3. SYSTEM ARCHITECTURE

Build the application as a **modular monolith initially**, not as a collection of microservices.

Maintain clear module boundaries so individual components can be separated into services later if scale justifies it.

### High-level architecture

Frontend:
Next.js Dashboard

↓

Main Application Backend:
NestJS REST APIs

↓

Business Logic:
Authentication, Tenancy, Customers, Bookings, Payments, Collections, Risk Scoring, AI Conversations

↓

Database:
PostgreSQL + Prisma

↓

External Integrations:
CRM / ERP, Gemini, Twilio, Deepgram, Sarvam AI, Payment Gateway

↓

Infrastructure:
Google Cloud Platform

### Architectural principles

- Clean Architecture.
- SOLID principles.
- Dependency Injection.
- Modular design.
- Separation of concerns.
- Multi-tenant data isolation.
- Provider abstraction.
- Centralised error handling.
- Consistent API responses.
- Testable business logic.

The main NestJS backend must remain the source of truth for business data and financial calculations.

---

# 4. MULTI-TENANT SAAS ARCHITECTURE

Multi-tenancy is a foundational requirement, not an optional future feature.

Multiple builders must be able to use the same application while keeping their information completely isolated.

### Tenant structure

Example:

Platform
- Builder A
  - Users
  - Projects
  - Units
  - Customers
  - Bookings
  - Payment Schedules
  - Payments
  - Collection Records
- Builder B
  - Users
  - Projects
  - Units
  - Customers
  - Bookings
  - Payment Schedules
  - Payments
  - Collection Records

### Mandatory rules

1. Every tenant-owned database record must have a `tenantId`.
2. Tenant identity must be derived from authenticated server-side context.
3. Never trust a tenant ID supplied directly by the frontend.
4. Every database query must enforce tenant scope.
5. Background jobs must carry and validate tenant context.
6. Integrations must use tenant-specific credentials and configurations.
7. Implement PostgreSQL Row-Level Security (RLS) as an additional isolation layer.
8. Set RLS context transactionally and prevent tenant context leaking through pooled database connections.
9. Test cross-tenant access explicitly.
10. Never expose another builder's customers, bookings, payments, reports or call records.

Use a tenant-scoped repository or equivalent centralised data-access boundary.

---

# 5. CLEAN CODE AND SOLID PRINCIPLES

SOLID principles are mandatory throughout the codebase.

### S — Single Responsibility Principle

Every class and module should have one clear responsibility.

Example:
- CustomerService manages customer operations.
- PaymentService manages payment operations.
- RiskScoringService calculates risk.
- CallService manages call workflows.

Do not create one massive service containing unrelated business logic.

### O — Open/Closed Principle

Modules should be extendable without repeatedly modifying existing core logic.

Example:
Adding another telephony provider should require a new provider implementation, not rewriting the entire calling system.

### L — Liskov Substitution Principle

Implementations of the same interface must be interchangeable without breaking expected behaviour.

Example:
Twilio and another telephony provider should satisfy the same telephony contract.

### I — Interface Segregation Principle

Prefer smaller, specific interfaces over one enormous interface.

Example:
Separate interfaces for:
- LLM provider
- Speech-to-text provider
- Text-to-speech provider
- Telephony provider
- Payment gateway
- CRM provider

### D — Dependency Inversion Principle

High-level business logic must depend on abstractions, not directly on external provider implementations.

Use NestJS Dependency Injection.

Business services should not be tightly coupled to Twilio, Gemini, Sarvam or any specific CRM.

---

# 6. DESIGN PATTERNS — MANDATORY WHERE APPROPRIATE

Use design patterns to solve real architectural problems. Do not add unnecessary abstractions simply to demonstrate patterns.

### 6.1 Factory Pattern

Mandatory for provider creation and selection.

Implement factories such as:
- LLMFactory
- TelephonyFactory
- STTFactory
- TTSFactory
- PaymentGatewayFactory
- CRMProviderFactory

Example:
The application should select the configured telephony provider without changing the collection business logic.

### 6.2 Strategy Pattern

Use for interchangeable business algorithms.

Examples:
- RiskScoringStrategy
- CollectionFollowupStrategy
- PaymentAllocationStrategy
- RetryStrategy

Different builders may eventually configure different collection strategies.

### 6.3 Adapter Pattern

Use adapters for external services.

Examples:
- TwilioAdapter
- GeminiAdapter
- DeepgramAdapter
- SarvamAdapter
- CRM adapters
- Payment gateway adapters

External provider responses should be converted into internal application formats.

### 6.4 Repository Pattern

Keep database access separate from business logic.

Services should not contain large amounts of raw database-query logic.

Use tenant-aware repositories and Prisma-backed implementations.

### 6.5 Dependency Injection

Use NestJS providers and dependency injection instead of manually creating tightly coupled service instances.

### 6.6 Observer / Event-Driven Pattern

Use domain events for important business activities.

Examples:
- InstalmentOverdue
- PaymentReceived
- PaymentPromiseCreated
- CallCompleted
- DisputeRaised
- CustomerRiskUpdated

Use a transactional outbox for important events that must not be lost between database transactions and background processing.

---

# 7. PRISMA AND DATABASE ENGINEERING

Prisma must be the authoritative database schema and migration system.

### Mandatory rules

1. Define database models in `schema.prisma`.
2. Use Prisma Migrate for schema changes.
3. Commit migration files to GitHub.
4. Generate and use Prisma Client types.
5. Never maintain a second competing database schema.
6. Never manually alter production database tables outside the migration process.
7. Review migrations before deployment.
8. Use a pinned, compatible Prisma version.
9. Keep development, staging and production database environments separate.

### Database design requirements

- Use UUID identifiers where appropriate.
- Use foreign-key relationships.
- Add `tenantId` to tenant-owned models.
- Add indexes for frequently queried fields.
- Add composite indexes for common tenant-scoped queries.
- Use unique constraints where required.
- Use appropriate deletion behaviour.
- Include `createdAt` and `updatedAt` fields where appropriate.
- Use enums for controlled status values.
- Use pagination for large collections.

### Financial data rules

- Never use floating-point numbers for money.
- Use PostgreSQL Decimal / Prisma Decimal for monetary values.
- Preserve currency information.
- Support partial payments.
- Support multiple bookings per customer.
- Support multiple instalments per booking.
- Support multiple payment transactions against an instalment.
- Maintain an auditable payment ledger.
- Calculate outstanding balances from verified transactions.
- Never mark a payment successful based only on an AI conversation.

### Core database models

Design the schema to support:

- Tenant
- User
- Role / Permission
- Project
- Unit
- Customer
- Booking
- PaymentSchedule
- Payment
- RiskScore
- CallLog
- PaymentPromise
- Dispute
- CommunicationPreference
- AIConversation
- IntegrationConfiguration
- AuditLog

Add other models only when justified by a documented business requirement.

---

# 8. CORE BUSINESS WORKFLOW

This is the most important application workflow.

### Step 1 — Builder Onboarding

- Builder creates an account.
- Platform creates a tenant.
- Builder invites team members.
- Roles and permissions are configured.
- Builder connects their CRM/ERP through an authorised integration.

### Step 2 — Fetch Builder Data

Fetch relevant data through authorised CRM/ERP APIs.

Retrieve:
- Customer information.
- Project information.
- Unit information.
- Booking details.
- Payment schedules.
- Payment history.

Do not assume that every CRM exposes the same API endpoints or fields.

Build separate CRM adapters.

If a CRM is unavailable during development, use clearly labelled seed/demo data.

### Step 3 — Identify Due Instalments

The backend identifies:
- Upcoming instalments.
- Due-today instalments.
- Overdue instalments.
- Partially paid instalments.
- Previously promised payments.

Use scheduled background jobs.

Do not rely on the frontend to calculate financial due dates or balances.

### Step 4 — Customer Risk Scoring

Calculate the probability of payment delay using historical behaviour.

Initial implementation should use a transparent rules-based score.

Potential factors:
- Previous late payments.
- Number of missed instalments.
- Average payment delay.
- Current overdue duration.
- Broken payment promises.
- Previous payment patterns.

Example segmentation:
- Low risk.
- Medium risk.
- High risk.
- Insufficient history.

Later, introduce ML models such as Logistic Regression, Random Forest, XGBoost or LightGBM when sufficient reliable historical data exists.

Risk scores must be explainable and must not be treated as proof of unwillingness to pay.

Avoid unfair or discriminatory scoring. Include human review and correction mechanisms.

### Step 5 — AI Voice Call

The system schedules a call to the homebuyer.

The AI agent:
- Identifies itself as an AI assistant calling on behalf of the builder.
- Uses the approved customer and booking context.
- Explains the relevant instalment.
- Politely reminds the customer about payment.
- Understands the customer's response.
- Handles questions and objections.
- Offers an approved payment link when appropriate.
- Records the call outcome.
- Escalates disputes and hardship situations to a human.

### Step 6 — Record Call Outcome

Supported outcomes should include:
- Payment promised.
- Payment link requested.
- Already paid.
- Customer unavailable.
- Callback requested.
- Payment dispute.
- Financial hardship.
- Wrong number.
- No answer.
- Customer declined to discuss.

Store structured outcomes in the database.

### Step 7 — Payment Processing

When appropriate, generate a payment link through an approved payment gateway.

The payment gateway must notify the backend through a verified webhook or an authorised reconciliation process.

Only after backend verification should the payment be marked successful.

Update:
- Payment record.
- Instalment balance.
- Booking outstanding balance.
- Customer payment history.
- Builder dashboard.

### Step 8 — Follow-up and Reporting

Schedule follow-ups based on the recorded outcome and configured collection policy.

Track payment promises, missed promises, disputes and successful recoveries.

---

# 9. AI AND LLM ENGINEERING GUIDELINES

Gemini is the primary LLM.

The LLM is responsible for:
- Understanding customer intent.
- Understanding conversational context.
- Handling natural-language questions.
- Identifying objections.
- Selecting an appropriate next conversational step.
- Producing structured tool-call requests.
- Generating polite, natural responses.

### Strict financial rules

The LLM is not the financial source of truth.

It must never independently invent or calculate authoritative:
- Outstanding amounts.
- Instalment dates.
- Late fees.
- Interest.
- Payment status.
- Refund status.
- Booking information.

These values must come from the backend.

### Tool/function calling

Provide controlled backend tools such as:
- GetCustomerBooking
- GetOutstandingInstalment
- GetPaymentHistory
- CreatePaymentLink
- RecordPaymentPromise
- ScheduleCallback
- RaiseDispute
- EscalateToHuman

The LLM must not receive unrestricted database access.

Every tool must validate:
- Authenticated context.
- Tenant ownership.
- Customer identity.
- Booking relationship.
- Allowed operation.
- Input data.

### Voice pipeline

For the initial implementation, use a controlled pipeline:

Customer speech
→ Deepgram Speech-to-Text
→ Gemini reasoning and function calling
→ NestJS backend tools
→ Sarvam Text-to-Speech
→ Customer hears the response.

Evaluate Gemini Live API later if real-time speech performance justifies it.

Do not assume that a chained pipeline or Cloud Run WebSocket connection will meet latency requirements without testing.

### Conversation requirements

The AI must:
- Be professional, polite and respectful.
- Never threaten or harass customers.
- Never misrepresent the builder.
- Never invent payment information.
- Never promise an unapproved waiver or discount.
- Never pressure a customer experiencing hardship.
- Escalate disputes to a human.
- Respect opt-out and communication preferences.
- Avoid unnecessary repetition.
- Clearly identify itself as an AI assistant.

---

# 10. VOICE AND TELEPHONY ENGINEERING

Use Twilio through a dedicated telephony abstraction.

Do not place Twilio-specific code throughout the application.

Implement:
- Call initiation.
- Call status tracking.
- Call completion handling.
- Retry scheduling.
- Call outcome recording.
- Failure handling.
- Webhook validation.
- Call duration tracking.
- Recording controls where legally permitted.

### Safety requirements

- Never ask for OTPs, PINs or card details over calls.
- Never store sensitive payment credentials in call transcripts.
- Do not call outside approved calling windows.
- Respect opt-outs and applicable contact preferences.
- Provide human escalation.
- Configure call recording only where legally permitted and appropriately disclosed.

For local development, staging and demos, disable real outbound calls by default.

Use a configuration such as:

`OUTBOUND_MODE=disabled`

Enable controlled team-only calls for authorised testing.

Production calls must remain disabled until legal, operational and telephony approvals are completed.

---

# 11. PAYMENT AND FINANCIAL INTEGRATION

Payment processing must be modular.

Use a payment gateway abstraction so that another provider can be introduced without rewriting collection logic.

### Payment requirements

- Generate payment links.
- Associate links with the correct customer and instalment.
- Validate webhook signatures.
- Handle duplicate webhooks idempotently.
- Record payment references.
- Support partial payments.
- Reconcile payment status.
- Update outstanding balances.
- Maintain transaction history.

### Important rule

A customer saying "I have paid" does not mean payment is successful.

The backend must verify the payment through the gateway or an authorised ledger reconciliation process.

### Interest and late fees

Do not invent interest rates or penalty amounts.

Use the applicable Agreement for Sale, builder policy and relevant state-specific legal requirements.

Any financial calculation must be performed and stored by the backend with an audit trail.

---

# 12. CRM / ERP INTEGRATION

CRM/ERP integration is a core feature.

The builder should connect their existing system rather than manually uploading customer files as the standard operating process.

Possible future integrations include:
- Sell.Do
- LeadSquared
- Zoho
- Other authorised real estate CRM/ERP systems

### Integration requirements

- Use official, authorised APIs.
- Support secure authentication.
- Store credentials in Google Secret Manager.
- Implement provider-specific adapters.
- Map external fields to internal data models.
- Handle pagination and rate limits.
- Handle API failures and retries.
- Record synchronisation status.
- Avoid duplicate records.
- Support scheduled synchronisation.
- Maintain an integration audit log.

Never assume that a provider supports an endpoint without verifying its documentation and access permissions.

---

# 13. FRONTEND AND DASHBOARD GUIDELINES

Build a clean, professional, responsive SaaS dashboard.

Use Next.js, React, TypeScript and Tailwind CSS.

### Main dashboard

Display:
- Total customers.
- Total outstanding amount.
- Amount collected.
- Overdue amount.
- Upcoming instalments.
- Collection recovery rate.
- Collection activity.
- Risk distribution.

### Customer management

Display:
- Customer name.
- Contact information.
- Project.
- Unit.
- Booking details.
- Outstanding balance.
- Next instalment date.
- Risk category.
- Last call outcome.

### Collection management

Display:
- Upcoming calls.
- Completed calls.
- Failed calls.
- Payment promises.
- Missed promises.
- Disputes.
- Human escalations.

### Analytics

Display:
- Collection recovery rate.
- On-time payment rate.
- Overdue balance.
- Promise fulfilment rate.
- Contact rate.
- Cost per successful collection.
- Human intervention rate.
- Collection efficiency.

### UI engineering rules

- Reusable components.
- Consistent design system.
- Responsive layouts.
- Proper loading states.
- Proper empty states.
- Error handling.
- Form validation.
- Accessible components.
- Server-side authorisation for protected data.

Never rely on hiding a frontend component as a security mechanism.

---

# 14. BACKEND MODULE STRUCTURE

Organise NestJS by business domain.

Suggested structure:

```text
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── pipes/
│   │   └── interfaces/
│   │
│   ├── config/
│   ├── auth/
│   ├── tenants/
│   ├── users/
│   ├── permissions/
│   ├── projects/
│   ├── units/
│   ├── customers/
│   ├── bookings/
│   ├── payment-schedules/
│   ├── payments/
│   ├── collections/
│   ├── risk-scoring/
│   ├── ai-conversations/
│   ├── calls/
│   ├── payment-promises/
│   ├── disputes/
│   ├── integrations/
│   ├── notifications/
│   ├── analytics/
│   ├── audit-logs/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── queues/
│   │   └── storage/
│   │
│   └── providers/
│       ├── llm/
│       ├── telephony/
│       ├── stt/
│       ├── tts/
│       ├── payment-gateways/
│       └── crm/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── test/
├── Dockerfile
└── package.json
```

Adapt this structure when implementation needs justify it. Do not create empty modules or unnecessary files simply to match the example.

---

# 15. API DESIGN

Use versioned REST APIs:

`/api/v1`

Examples:

```text
/api/v1/auth
/api/v1/tenants
/api/v1/users
/api/v1/projects
/api/v1/units
/api/v1/customers
/api/v1/bookings
/api/v1/payment-schedules
/api/v1/payments
/api/v1/collections
/api/v1/risk-scores
/api/v1/calls
/api/v1/payment-promises
/api/v1/disputes
/api/v1/integrations
/api/v1/analytics
```

### API standards

- DTO validation.
- Authentication and authorisation.
- Tenant-scoped access.
- Consistent response structure.
- Appropriate HTTP status codes.
- Pagination and filtering.
- Centralised exception handling.
- API documentation.
- Idempotency for financial and retry-sensitive operations.

Use Postman to test endpoints.

Maintain separate local, staging and production environments.

Never store production credentials in shared Postman collections or examples.

---

# 16. SECURITY AND DATA PRIVACY

Security must be designed into the platform from the beginning.

Mandatory requirements:

- Secure authentication.
- Role-based access control.
- Tenant-level isolation.
- PostgreSQL RLS.
- HTTPS.
- Encryption in transit and at rest.
- Secure password handling.
- Secret Manager for API credentials.
- Least-privilege service accounts.
- Input validation.
- Rate limiting.
- Webhook signature validation.
- Audit logging.
- Secure session management.
- Data retention policies.
- Backup and recovery procedures.
- Protection against SQL injection and common web vulnerabilities.

### Indian regulatory and compliance considerations

Before production deployment, obtain appropriate legal and compliance review for:
- Applicable TRAI requirements and commercial communication rules.
- DLT registration and template requirements where applicable.
- Do Not Disturb and consent requirements.
- Permitted calling hours and number-series requirements.
- AI disclosure and call recording disclosures.
- Applicable Indian data protection and privacy obligations.
- RERA-related contractual and state-specific requirements.

Do not treat a technically successful call as proof of legal permission to contact a customer.

---

# 17. GOOGLE CLOUD INFRASTRUCTURE

Use Google Cloud for deployment and infrastructure.

### Services

**Cloud Run**
- Deploy the NestJS backend.
- Deploy the Next.js application where appropriate.
- Deploy specialised FastAPI services.

**Cloud SQL**
- Host PostgreSQL.

**Cloud Tasks**
- Schedule collection calls.
- Manage retries.
- Process asynchronous tasks.

**Cloud Scheduler**
- Trigger recurring synchronisation.
- Identify due instalments.
- Run reconciliation jobs.

**Secret Manager**
- Store API keys and service credentials.

**Cloud Storage**
- Store permitted call recordings and exports.

**Cloud Logging and Monitoring**
- Monitor application errors.
- Track service health.
- Monitor background jobs.
- Track latency and failures.

**Cloud Build and Artifact Registry**
- Build and store deployable containers.

### Deployment rules

- Use separate development, staging and production environments.
- Use separate credentials and database instances/configurations.
- Use dedicated service accounts.
- Do not commit credentials.
- Use database migrations during controlled deployment.
- Configure backups.
- Monitor service health.
- Test long-running voice connections and WebSocket behaviour before relying on them in production.

---

# 18. TESTING REQUIREMENTS

Testing is mandatory, not optional.

### Unit testing

Test:
- Payment calculations.
- Risk-scoring logic.
- Collection rules.
- Payment status transitions.
- Validation.
- Provider selection.

### Integration testing

Test:
- Prisma database operations.
- NestJS modules.
- CRM synchronisation.
- Payment gateway webhooks.
- Background jobs.
- AI tool calling.
- Telephony provider adapters.

### Security testing

Test:
- Tenant isolation.
- Unauthorised access.
- Role permissions.
- Invalid webhook signatures.
- Secret exposure.
- Input validation.

### Business-critical testing

Specifically test:
- Duplicate payment webhooks.
- Partial payments.
- Multiple bookings per customer.
- Missed payment promises.
- Failed calls.
- Repeated call retries.
- Disputed instalments.
- Human escalation.
- Database transaction failures.

Never deploy an important financial workflow without tests.

---

# 19. GITHUB AND DEVELOPMENT WORKFLOW

Use GitHub for source control.

### Branch strategy

```text
main
  └── develop
       ├── feature/authentication
       ├── feature/customer-management
       ├── feature/payment-system
       ├── feature/risk-scoring
       ├── feature/ai-voice-agent
       └── feature/dashboard
```

### Rules

- `main` must remain stable.
- Use feature branches.
- Review changes before merging.
- Test before merging.
- Do not commit secrets.
- Use meaningful commit messages.
- Protect production branches.
- Do not force-push shared branches.

### Linear commit history

`main` and `develop` must have a linear history with no merge commits.

Mandatory rules:

1. Never create merge commits on `main` or `develop`.
2. Merge feature pull requests into `develop` with **Rebase and merge** (or **Squash and merge** for a branch with noisy work-in-progress commits). Never use **Create a merge commit**.
3. Before opening or merging a pull request, rebase the feature branch onto the latest base branch and re-run tests.
4. Pull with rebase, never with merge.
5. Promote `develop` to `main` by a local fast-forward push only, never through a GitHub pull request. GitHub's **Rebase and merge** always rewrites commits with new IDs, even when a fast-forward is possible, so a `develop` → `main` pull request leaves the two branches with different copies of the same commits.
6. Force-pushing is allowed only on your own feature branch, only after a rebase, and only with `--force-with-lease`.
7. Never rebase or force-push `main` or `develop`. If a history rewrite is unavoidable, agree it with the team first and tell everyone to reset their local copy afterwards.
8. Delete a feature branch once its pull request is merged. GitHub deletes the remote branch automatically; delete your local copy yourself. Its commits now have different IDs on `develop`, so continuing on it causes divergence. Start the next piece of work on a new branch from the latest `origin/develop`.

One-time local setup:

```bash
git config --global pull.rebase true
git config --global rebase.autoStash true
git config --global fetch.prune true
```

Updating a feature branch before a pull request:

```bash
git fetch origin
git rebase origin/develop
# resolve conflicts, then: git add <files> && git rebase --continue
pnpm lint && pnpm typecheck && pnpm test
git push --force-with-lease
```

Promoting `develop` to `main`:

```bash
git switch main
git pull --ff-only
git merge --ff-only origin/develop
git push origin main
```

If `--ff-only` fails, `main` has commits that `develop` does not. Stop and resolve it with the team; do not merge.

Starting new work after a pull request is merged:

```bash
git fetch --prune origin
git switch -c feature/<name> origin/develop
git branch -D <old-feature-branch>
```

Resetting a local `main` or `develop` that has diverged from GitHub (for example after an agreed history rewrite). Push any unique local work to a feature branch first; this discards local commits:

```bash
git fetch --prune origin
git switch develop
git reset --hard origin/develop
git switch main
git reset --hard origin/main
```

Verifying history is linear (both commands must print nothing):

```bash
git rev-list --merges origin/main
git rev-list --merges origin/develop
```

Required GitHub repository settings:

- Settings → General → Pull Requests: disable **Allow merge commits**; keep **Allow rebase merging** (and optionally **Allow squash merging**) enabled; enable **Automatically delete head branches** so merged feature branches are removed from GitHub.
- Branch protection or rulesets for `develop`: enable **Require linear history**, **Require a pull request before merging**, and block force pushes and deletions.
- Branch protection or rulesets for `main`: enable **Require linear history**, block force pushes and deletions, and restrict pushes to the maintainers who promote `develop`. Do not require a pull request for `main`, because promotion is a fast-forward push.

### Environment files

Commit `.env.example` with variable names and empty placeholders.

Never commit:
- `.env`
- Production API keys.
- Google service account credentials.
- Private keys.
- Database passwords.
- Twilio credentials.

Use `.gitignore`, GitHub Secret Scanning and Push Protection where available.

---

# 20. PYTHON FASTAPI AI/ML SERVICE

Python FastAPI is a specialised supporting service, not the primary application backend.

Use it only where Python provides a meaningful advantage.

Possible responsibilities:
- ML-based risk prediction.
- Model training.
- Model evaluation.
- Batch scoring.
- Model inference.

### Rules

- Communicate with NestJS through authenticated internal APIs.
- Validate request and response schemas.
- Version ML models.
- Record model versions and prediction timestamps.
- Monitor model performance.
- Handle insufficient historical data.
- Do not directly modify the main production database.
- Do not introduce a second ORM as the competing source of truth.
- Keep financial calculations in NestJS.

Start with rules-based scoring before introducing a trained model.

---

# 21. PRODUCT DEVELOPMENT PHASES

Develop the product incrementally.

Do not attempt to build everything simultaneously.

### Phase 1 — SaaS Foundation

- Project structure.
- NestJS setup.
- Next.js setup.
- PostgreSQL setup.
- Prisma schema.
- Authentication.
- Tenant management.
- RBAC.
- Tenant isolation tests.

### Phase 2 — Real Estate Data Management

- Projects.
- Units.
- Customers.
- Bookings.
- Payment schedules.
- Payment history.
- Outstanding balance calculations.

### Phase 3 — Collection Engine

- Due instalment detection.
- Overdue identification.
- Collection queue.
- Rules-based risk scoring.
- Payment promise management.
- Collection dashboard.

### Phase 4 — AI Integration

- Gemini integration.
- Structured outputs.
- Function calling.
- Customer intent detection.
- Conversation management.
- Human escalation.

### Phase 5 — Voice Agent

- Twilio integration.
- Deepgram integration.
- Sarvam TTS integration.
- Controlled calling pipeline.
- Call logging.
- Call outcome processing.

### Phase 6 — Payment Integration

- Payment gateway abstraction.
- Payment link generation.
- Webhook verification.
- Payment reconciliation.
- Balance updates.

### Phase 7 — Intelligence and Analytics

- Collection analytics.
- Customer risk insights.
- Promise fulfilment analysis.
- ML risk prediction when sufficient data is available.

### Phase 8 — Production Readiness

- Security review.
- Compliance review.
- Load testing.
- Monitoring.
- Backup and recovery.
- Production deployment.

---

# 22. MVP SCOPE — DO NOT OVERBUILD

The first version must demonstrate one complete business workflow:

1. Builder logs into the platform.
2. Builder data is fetched from a CRM API or seeded demo dataset.
3. System identifies a homebuyer with a due or overdue instalment.
4. System calculates a risk score.
5. AI agent initiates a permitted test call.
6. AI agent understands the homebuyer's response.
7. System records the call outcome.
8. AI agent can provide a payment link when appropriate.
9. Backend verifies the payment.
10. Dashboard reflects the updated payment status.

This is the first complete success loop.

### Do not add unrelated features

Unless specifically approved, do not build:
- A mobile application.
- Property listing functionality.
- Real estate lead generation.
- WhatsApp marketing.
- SMS marketing campaigns.
- Email marketing.
- Accounting software.
- Employee management.
- Unnecessary AI agents.
- Unnecessary third-party integrations.

Prioritise a working collections workflow over feature quantity.

---

# 23. PERFORMANCE AND SCALABILITY

Build for future growth without prematurely overengineering.

Mandatory considerations:
- Database indexing.
- Pagination.
- Connection pooling.
- Efficient Prisma queries.
- Background processing.
- Idempotent jobs.
- API rate limiting.
- Caching only where useful.
- Structured logging.
- Retry and failure handling.
- Monitoring.
- Database transaction integrity.

Avoid:
- N+1 queries.
- Unbounded database queries.
- Long synchronous API operations.
- Duplicate payment processing.
- Uncontrolled AI calls.
- Unnecessary microservices.

---

# 24. INSTRUCTIONS FOR CLAUDE — HOW TO WORK ON THIS PROJECT

Follow these rules whenever modifying the repository.

### Before writing code

1. Inspect the existing repository.
2. Understand the existing folder structure.
3. Read relevant files before modifying them.
4. Identify existing patterns and dependencies.
5. Understand the requested business requirement.
6. Explain the proposed implementation briefly when the change is architectural or significant.
7. Avoid rewriting working code unnecessarily.

### While writing code

1. Follow SOLID principles.
2. Follow Clean Architecture.
3. Use appropriate design patterns.
4. Use dependency injection.
5. Use Prisma as the database schema and migration authority.
6. Enforce tenant isolation.
7. Validate all external input.
8. Use TypeScript types properly.
9. Keep functions and classes focused.
10. Avoid duplicated business logic.
11. Avoid unnecessary abstractions.
12. Handle errors explicitly.
13. Add tests for important logic.
14. Never hardcode credentials.
15. Never bypass the established architecture for convenience.

### After writing code

1. Run relevant tests.
2. Check TypeScript errors.
3. Check linting and formatting.
4. Review Prisma schema and migration implications.
5. Verify tenant isolation where relevant.
6. Explain which files were created or modified.
7. Explain important implementation decisions.
8. Mention any configuration or environment variables required.
9. Identify incomplete functionality honestly.
10. Do not claim a feature works unless it has been tested.

### When a requirement is unclear

Ask before making a major architectural or business-logic assumption.

Do not silently invent:
- Payment rules.
- Interest rates.
- Builder policies.
- CRM API capabilities.
- Legal requirements.
- Customer permissions.
- Financial data.

---

# 25. NON-NEGOTIABLE ENGINEERING PRINCIPLES

1. NestJS is the primary backend.
2. PostgreSQL is the primary database.
3. Prisma is the database schema and migration authority.
4. Next.js is the frontend.
5. Gemini is the primary LLM.
6. Python FastAPI is reserved for specialised AI/ML workloads.
7. Multi-tenancy is foundational.
8. SOLID principles must be followed.
9. Clean Architecture must be maintained.
10. Use Factory, Strategy, Adapter, Repository and Dependency Injection where appropriate.
11. The backend is the financial source of truth.
12. Payment success must be verified.
13. Customer communication must be respectful and compliant.
14. Sensitive credentials must never be committed.
15. Tests are required for business-critical functionality.
16. Do not introduce unnecessary technologies or features.
17. Build a modular monolith before considering microservices.
18. Security and tenant isolation must never be sacrificed for development speed.

---

# FINAL PRODUCT VISION

Build a production-oriented, scalable, multi-tenant AI Collections Intelligence Platform for real estate developers.

The platform should connect builder CRM/ERP data, identify upcoming and overdue instalments, assess payment-delay risk, communicate with homebuyers through AI voice agents, track payment promises, verify payments and provide actionable collection intelligence through a central dashboard.

**Engineering objective:** Build a secure and maintainable SaaS foundation first, then add AI and automation through well-defined modules and provider abstractions.

**Business objective:** Help real estate developers collect payments more efficiently, reduce overdue receivables and improve visibility into their cash flow.

**Development philosophy:** Correct architecture, reliable financial data, secure tenant isolation and a complete working collection workflow take priority over unnecessary features and rushed implementation.
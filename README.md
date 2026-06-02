# Technical Workflow: Converting an Excel Techno-Economic Mining Model into a Full-Stack Web Application
### Stack: Spring Boot (Maven) · MongoDB · ReactJS

---

## Table of Contents

1. Phase 0 — Project Scoping & Team Setup
2. Phase 1 — Excel Audit & Decomposition
3. Phase 2 — Data Architecture & MongoDB Design
4. Phase 3 — Formula Engine Design (Backend Logic Layer)
5. Phase 4 — Spring Boot Backend Development
6. Phase 5 — REST API Design & Security
7. Phase 6 — ReactJS Frontend Development
8. Phase 7 — Admin Interface Build
9. Phase 8 — Client Interface Build
10. Phase 9 — Integration & End-to-End Testing
11. Phase 10 — Deployment & DevOps
12. Phase 11 — Maintenance & Iteration
13. Architecture Diagram (Text Representation)

---

## Phase 0 — Project Scoping & Team Setup

### Step 0.1 — Define Stakeholders and Roles

Identify and document the roles involved in the project before a single line of work begins:

- **Project Owner / Domain Expert** — The mining/techno-economic analyst who built or operates the Excel model. Their approval is required at every formula-translation milestone.
- **Backend Developer** — Responsible for Spring Boot services, formula engine, and MongoDB interactions.
- **Frontend Developer** — Responsible for the React application, admin forms, and client dashboards.
- **DevOps Engineer** — Handles CI/CD pipelines, server provisioning, environment configs.
- **QA Engineer** — Validates computed outputs from the web app against the original Excel values.
- **Admin Users** — Internal stakeholders who will feed input values via the admin interface.
- **Client Users** — External clients who view the computed results via the client dashboard.

### Step 0.2 — Define Scope Boundaries

Explicitly document what is in and out of scope. Key decisions to make upfront:

- Which Excel sheets will be migrated in the first release vs. later phases?
- Which input fields will admins control vs. being system constants?
- Which result metrics will be surfaced to the client?
- Which dropdown switches will be available on the client interface, and what conditions do they toggle?
- Will there be multiple concurrent client projects (multi-tenancy), or is this single-project initially?

### Step 0.3 — Set Up Project Management

- Create a project board (Jira, Trello, or similar) with phases mapped to sprints.
- Create a shared document repository (Confluence, Notion, or Google Drive) for formula documentation, schema decisions, and meeting notes.
- Set up version control: create a Git repository with a branching strategy (e.g., `main`, `develop`, `feature/*`, `release/*`).
- Establish a weekly sync cadence between the domain expert and the development team.

---

## Phase 1 — Excel Audit & Decomposition

This is the most critical phase of the entire project. Mistakes here propagate into every subsequent layer.

### Step 1.1 — Create a Complete Sheet Inventory

Open the Excel workbook and list every sheet. For each sheet, record:

- Sheet name and its business purpose (e.g., "Capital Cost Inputs", "Operating Cost Calculations", "NPV & IRR Summary").
- Whether the sheet is primarily an **input sheet**, a **calculation/intermediate sheet**, or an **output/result sheet**.
- Approximate number of rows and columns with meaningful data.
- Presence of charts, pivot tables, or macros (VBA).

### Step 1.2 — Classify All Cells into Four Categories

Go through every meaningful cell in the workbook and assign it to one of four types. This classification will directly map to the system's architecture:

**Category A — Direct Inputs (Admin-Editable)**
These are hardcoded numeric or text values that the admin will change per client project. Examples include ore grade, ore tonnage per year, commodity price assumption, capital expenditure estimates, discount rate, project life in years, royalty percentage, etc. Document each one with its cell reference, its human-readable label, its current value, its unit (e.g., USD/tonne, %), and any known valid range or constraint.

**Category B — System Constants (Hardcoded)**
These are values that never change regardless of the project — physical constants, universal tax rates fixed by law, regulatory minimums. These will be hardcoded directly into the backend Spring Boot service layer, not stored in the database as editable values.

**Category C — Intermediate Calculation Cells**
These cells hold formulas that reference Category A inputs and other Category C cells to produce values used in further calculations. They are not shown to anyone — they are the internal computation chain. Document each one with its exact Excel formula, its cell reference, a descriptive name, and all of its dependencies (which cells it reads from).

**Category D — Output/Result Values (Client-Facing)**
These are the final metrics that will appear on the client dashboard. Examples include Net Present Value (NPV), Internal Rate of Return (IRR), payback period, annual revenue projections, operating cost per tonne, total capital requirement, break-even commodity price, etc. Document each with its cell reference, its human-readable label, unit, and whether it needs chart visualisation or just a KPI card.

### Step 1.3 — Map the Full Dependency Chain

For every Category D output, trace backward through every Category C formula until you reach only Category A inputs or Category B constants. Draw or document this as a dependency tree. This is your formula execution graph.

Example structure:
- NPV (D) ← Net Cash Flow per Year (C) ← [Annual Revenue (C) − Annual OpEx (C) − Annual Capex Amortisation (C)]
- Annual Revenue (C) ← [Ore Processed per Year (A) × Commodity Price (A) × Recovery Rate (A) × (1 − Royalty % (A))]
- Annual OpEx (C) ← [Mining Cost per Tonne (A) × Ore Processed per Year (A)] + [Processing Cost per Tonne (A) × Ore Processed per Year (A)] + Sustaining Capex (A)

Do this for every output. This dependency map becomes the specification document for the backend Formula Engine.

### Step 1.4 — Identify Conditional Logic

Search the entire workbook for `IF`, `IFS`, `CHOOSE`, `SWITCH`, `VLOOKUP`, `HLOOKUP`, `INDEX/MATCH`, and `IFERROR` formulas. For each one found:

- Document the condition being tested.
- Document the true-branch formula.
- Document the false-branch formula.
- Identify whether the condition is controlled by a Category A admin input or by something else.
- Determine if the condition maps to a client-facing dropdown switch.

### Step 1.5 — Identify Scenario / Switch Logic

Identify all places in the model where a different scenario (e.g., "Base Case vs Optimistic vs Pessimistic", or "Open Pit vs Underground Mining", or "Heap Leach vs CIL Processing") changes the calculation path. Each of these scenarios becomes a **dropdown switch option** on the client interface. Document:

- The switch name and its option values.
- Exactly which input values or formula paths change for each option.
- Whether switching changes Category A inputs, Category C formulas, or both.

### Step 1.6 — Document All Formulas in a Master Specification Sheet

Create a formula specification spreadsheet or document (separate from the Excel model) with columns: Formula ID, Human-Readable Name, Category (C or D), Excel Cell Reference, Excel Formula (verbatim), Translated Business Logic Description (plain English), Dependencies (list of Formula IDs or Input IDs), Output Unit, Applies to Scenario/Switch (if conditional). This document is the contract between the domain expert and the backend developer.

### Step 1.7 — Domain Expert Sign-Off

Before proceeding to any technical work, have the domain expert (the mining analyst) review and sign off on the formula specification document. Every formula translation must be validated against a set of known test cases — prepare at least 5–10 Excel model runs with specific inputs and record the exact output values. These become the regression test suite for the backend.

---

## Phase 2 — Data Architecture & MongoDB Design

### Step 2.1 — Understand Why MongoDB Fits This Use Case

The techno-economic model has a highly variable schema — different mining projects may have different numbers of inputs, different applicable scenarios, different output sets. MongoDB's document model accommodates this naturally without schema migration. However, disciplined schema design is still essential.

### Step 2.2 — Identify the Core Collections

Based on the Excel audit, define the following MongoDB collections:

**Collection: `projects`**
Each document represents one client mining project. It stores the project's identity, which client it belongs to, and its current lifecycle state (draft, published, archived). Fields include project ID, project name, commodity type (gold, copper, coal, etc.), mining method, project description, creation timestamp, last modified timestamp, status, and associated client ID.

**Collection: `input_snapshots`**
Each document is a versioned set of all Category A admin inputs for a specific project. Storing snapshots (not overwriting) allows full audit history and the ability to compare model runs. Fields include snapshot ID, project ID (reference), version number, timestamp, admin user who saved it, a label (e.g., "Base Case March 2025"), and an embedded map of all input key-value pairs (the entire set of Category A values in one document).

**Collection: `computed_results`**
Each document stores the computed outputs for a specific input snapshot and a specific scenario/switch combination. Fields include result ID, project ID, snapshot ID (reference), scenario key (e.g., `"openpit_heapleach_base"`), computation timestamp, and an embedded map of all Category D output values. Results are never recomputed on every client request — they are stored here after an admin triggers computation.

**Collection: `input_definitions`**
This is a metadata collection that defines what each Category A input is. It is not project-specific — it defines the universal schema of inputs. Each document describes one input field: field key (the unique programmatic key, e.g., `"ore_grade_gpt"`), display label ("Ore Grade (g/t)"), input type (number, percentage, integer, dropdown), unit, min value, max value, default value, tooltip description, grouping (e.g., "Ore Body Parameters", "Operating Costs", "Financial Assumptions"), and display order. This collection drives the admin form rendering dynamically.

**Collection: `output_definitions`**
Similarly defines each Category D output field: field key, display label, unit, chart type preferred (KPI card, line chart, bar chart, waterfall chart, pie chart), decimal places to display, description for tooltip on client dashboard.

**Collection: `scenarios`**
Defines each switchable scenario: scenario group name (e.g., "Mining Method"), option values (e.g., "Open Pit", "Underground"), default option. This drives the client-facing dropdown switches.

**Collection: `users`**
Stores user accounts: user ID, email, hashed password, role (ADMIN or CLIENT), associated project IDs (for clients), creation timestamp, last login.

**Collection: `audit_logs`**
Stores every admin action: who changed what input, when, from what value to what value, on which project.

### Step 2.3 — Design the Embedded Document Structures

For the `input_snapshots` collection, the `inputs` field is an embedded JSON object, not a separate array, for efficient atomic reads. Example embedded structure design (conceptual):

```
inputs: {
  ore_body: {
    ore_grade_gpt: 1.8,
    ore_tonnes_per_year: 2500000,
    strip_ratio: 6.5,
    mine_life_years: 15,
    recovery_rate_pct: 88.5
  },
  commodity_pricing: {
    gold_price_usd_oz: 1950,
    price_escalation_pct: 2.0
  },
  capital_costs: {
    initial_capex_musd: 450,
    sustaining_capex_pa_musd: 12
  },
  operating_costs: {
    mining_cost_usd_t: 3.80,
    processing_cost_usd_t: 12.50,
    gna_cost_usd_t: 1.20
  },
  financial: {
    discount_rate_pct: 8.0,
    royalty_pct: 3.5,
    corporate_tax_rate_pct: 30.0
  }
}
```

This grouping must mirror the grouping defined in `input_definitions` so the admin form can be rendered section by section.

### Step 2.4 — Design Indexing Strategy

Define MongoDB indexes before development begins:

- `projects` collection: Index on `clientId` and `status`.
- `input_snapshots` collection: Compound index on `projectId` + `versionNumber`.
- `computed_results` collection: Compound index on `projectId` + `snapshotId` + `scenarioKey`.
- `users` collection: Unique index on `email`.
- `audit_logs` collection: Index on `projectId` + `timestamp` (for chronological retrieval).

### Step 2.5 — Decide on Object ID Strategy

Use MongoDB's default `ObjectId` for internal document IDs. Expose human-readable UUIDs (UUID v4) as the public-facing identifier in API responses to avoid leaking internal database structure to the client.

---

## Phase 3 — Formula Engine Design (Backend Logic Layer)

This is the intellectual heart of the application. It is the translation of the Excel workbook's computation graph into executable Java code.

### Step 3.1 — Design the Engine's Responsibility

The Formula Engine is a standalone, stateless Java component within the Spring Boot application. Its sole job is: receive a flat map of all Category A input values and a scenario key → execute all Category C calculations in the correct dependency order → return a flat map of all Category D output values. It never touches the database. It never handles HTTP. It is a pure computation component.

### Step 3.2 — Organise Formulas into Calculation Modules

Group the Category C formulas into logical modules that mirror the Excel sheet structure. Each module is a Java class (or service) responsible for one domain area. Example modules:

- `OreBodyCalculationModule` — calculates annual ore processed, waste stripped, total material moved.
- `RevenueCalculationModule` — calculates gross revenue, net revenue after royalties, year-by-year revenue schedule.
- `CapexCalculationModule` — calculates pre-production capital, sustaining capital, total capital schedule.
- `OpexCalculationModule` — calculates total operating cost per tonne, total annual operating cost.
- `TaxCalculationModule` — calculates EBITDA, EBIT, tax payable, after-tax net income.
- `CashFlowCalculationModule` — calculates annual free cash flow, cumulative cash flow.
- `ValuationCalculationModule` — calculates NPV, IRR, payback period, break-even price.
- `SensitivityCalculationModule` — calculates output values across a range of a given input (for tornado/spider charts).

### Step 3.3 — Define the Calculation Execution Order

Using the dependency tree from Phase 1, determine the strict execution order of modules. Module B cannot be executed before Module A if B depends on outputs from A. Define this as an ordered execution pipeline:

1. OreBodyCalculationModule
2. RevenueCalculationModule (depends on OreBody outputs)
3. CapexCalculationModule (independent)
4. OpexCalculationModule (depends on OreBody outputs)
5. TaxCalculationModule (depends on Revenue and Opex outputs)
6. CashFlowCalculationModule (depends on Revenue, Capex, Opex, Tax outputs)
7. ValuationCalculationModule (depends on CashFlow outputs)
8. SensitivityCalculationModule (depends on all above, runs last)

This ordered pipeline is orchestrated by a single `FormulaEngineOrchestrator` class.

### Step 3.4 — Handle Scenario Logic

Each switchable scenario (client dropdown) alters which formula variant is used in one or more modules. Design the engine to accept a `ScenarioContext` object alongside the inputs. The ScenarioContext carries the selected option for each scenario group (e.g., `miningMethod = "OPEN_PIT"`, `processingRoute = "HEAP_LEACH"`). Modules check the ScenarioContext to select the correct formula branch. This is implemented as a strategy pattern or a simple conditional block within each relevant module.

### Step 3.5 — Handle Year-by-Year Iterative Calculations

Many techno-economic models are schedule-based — they compute values for each year of the project life (Year 1 through Year N). Design the engine to produce arrays/lists of annual values, not just summary totals. The client interface will display year-by-year charts from these arrays.

### Step 3.6 — Implement Precision and Rounding Rules

Floating-point precision errors in financial models are significant. Decide upfront on the precision strategy:

- All internal intermediate calculations will use Java's `BigDecimal` type, not `double` or `float`.
- Define the rounding mode for each output type (e.g., NPV rounded to 2 decimal places in millions, percentages to 2 decimal places, costs per tonne to 4 decimal places).
- These rounding rules must match what the Excel model produces, verified against the test cases from Step 1.7.

### Step 3.7 — Write Formula Unit Tests Before Implementation

Before writing any formula code, write the unit tests. For each formula module, write test cases using the known Excel inputs and outputs from Step 1.7. The formula module implementation is complete only when all tests pass. This is test-driven development applied to financial computation — it is non-negotiable for an engine this sensitive.

---

## Phase 4 — Spring Boot Backend Development

### Step 4.1 — Initialise the Maven Project Structure

Use Spring Initializr (start.spring.io) to create the project with the following dependencies: Spring Web, Spring Data MongoDB, Spring Security, Spring Validation, Spring Boot Actuator, and Lombok. Also add the Apache POI dependency if any Excel parsing will be needed for initial data import.

Organise the project with a clean layered package structure:

```
com.company.mining
├── config/           — Spring Security, MongoDB, CORS configs
├── controller/       — REST controllers (HTTP layer only)
├── service/          — Business logic services
├── engine/           — Formula engine (all calculation modules)
│   ├── modules/      — Individual calculation module classes
│   ├── model/        — Engine input/output data transfer objects
│   └── orchestrator/ — Pipeline orchestrator
├── repository/       — MongoDB repository interfaces
├── model/            — MongoDB document entity classes
├── dto/              — API request and response DTOs
├── security/         — JWT filter, user details service
├── exception/        — Custom exceptions and global error handler
└── util/             — Utility classes
```

### Step 4.2 — Configure MongoDB Connection

Set up `application.properties` (or `application.yml`) with MongoDB connection properties using environment variables (not hardcoded credentials) for the connection URI, database name, and authentication. Configure separate profiles for development (local MongoDB), staging, and production.

### Step 4.3 — Build the Repository Layer

Create Spring Data MongoDB repository interfaces for each collection defined in Phase 2. Use Spring Data's query method naming conventions for simple queries. Write `@Query`-annotated methods for complex queries such as finding the latest published snapshot for a project, or finding all results for a project across all scenarios.

### Step 4.4 — Build the Service Layer

Create service classes that sit between the controllers and the repositories. Services orchestrate business operations:

- `ProjectService` — CRUD for projects, project publishing/archiving.
- `InputService` — Saving new input snapshots, retrieving current and historical snapshots, validating input values against defined ranges.
- `ComputationService` — Receives a snapshot ID and scenario, calls the Formula Engine Orchestrator, persists computed results to the `computed_results` collection.
- `ResultService` — Retrieving computed results for client display, filtering by scenario, formatting for API response.
- `UserService` — User management, role assignment, password handling.
- `AuditService` — Recording every admin input change with full before/after context.

### Step 4.5 — Build the Formula Engine Implementation

Translate every formula from the specification document (Step 1.6) into Java methods within the appropriate calculation module class. Follow these implementation rules strictly:

- Each module's computation method receives only the inputs it needs (passed in, never fetched by the module itself).
- Each module returns a result object containing its outputs.
- No module directly calls another module — the orchestrator passes outputs from one module as inputs to the next.
- Every formula has a corresponding comment referencing the formula specification document ID and the original Excel cell reference.
- Every formula uses `BigDecimal` arithmetic with explicit scale and rounding mode.

### Step 4.6 — Implement the Computation Trigger Flow

The trigger for computation is an admin action, not a client request. Design the flow as follows:

1. Admin saves a new input snapshot via the admin interface.
2. Backend saves the snapshot to `input_snapshots` collection.
3. Admin then triggers "Run Computation" (a deliberate separate button in the UI).
4. Backend `ComputationService` receives the snapshot ID.
5. It retrieves the snapshot's input values.
6. For each defined scenario combination, it calls the Formula Engine Orchestrator.
7. Each result set is saved to `computed_results` with the corresponding scenario key.
8. The project's status is updated to indicate fresh results are available.
9. The admin interface shows a summary of computation success or any formula errors.

This design ensures client-facing results are always pre-computed and served instantly — no real-time formula execution per client request.

### Step 4.7 — Implement Input Validation

Using Spring Validation (`@Valid`, `@NotNull`, `@Min`, `@Max`, `@DecimalMin`, `@DecimalMax`), validate every admin-submitted input against the constraints defined in `input_definitions`. Return structured error messages identifying which field failed and why. Never let invalid inputs reach the formula engine.

### Step 4.8 — Implement Global Exception Handling

Create a `@RestControllerAdvice` class that catches all exceptions and returns standardised JSON error responses. Define custom exceptions: `ProjectNotFoundException`, `SnapshotNotFoundException`, `ComputationException`, `InvalidInputException`, `UnauthorisedAccessException`. All exceptions must produce HTTP responses with consistent body structure: error code, human-readable message, timestamp, and request path.

---

## Phase 5 — REST API Design & Security

### Step 5.1 — Design the API Endpoint Inventory

Define all REST endpoints before implementation begins. Organise them into endpoint groups:

**Authentication Endpoints:**
- `POST /api/auth/login` — accepts email + password, returns JWT token and user role.
- `POST /api/auth/logout` — invalidates session.
- `POST /api/auth/refresh` — refreshes an expiring JWT.

**Admin Project Management Endpoints:**
- `GET /api/admin/projects` — list all projects.
- `POST /api/admin/projects` — create new project.
- `GET /api/admin/projects/{projectId}` — get project detail.
- `PUT /api/admin/projects/{projectId}` — update project metadata.
- `PUT /api/admin/projects/{projectId}/publish` — publish project results to client.
- `DELETE /api/admin/projects/{projectId}` — archive project.

**Admin Input Management Endpoints:**
- `GET /api/admin/projects/{projectId}/inputs/current` — get current input snapshot.
- `GET /api/admin/projects/{projectId}/inputs/history` — get all historical snapshots.
- `POST /api/admin/projects/{projectId}/inputs` — save new input snapshot.
- `POST /api/admin/projects/{projectId}/compute` — trigger computation for current snapshot.
- `GET /api/admin/input-definitions` — get all input field definitions (drives form rendering).

**Admin Result Review Endpoints:**
- `GET /api/admin/projects/{projectId}/results` — get computed results for all scenarios.
- `GET /api/admin/projects/{projectId}/audit` — get audit log of input changes.

**Client Dashboard Endpoints:**
- `GET /api/client/projects` — get list of projects accessible to logged-in client.
- `GET /api/client/projects/{projectId}/summary` — get high-level result summary (KPI cards).
- `GET /api/client/projects/{projectId}/results` — get full result set for selected scenario.
- `GET /api/client/projects/{projectId}/results?scenario={scenarioKey}` — get results for a specific scenario switch selection.
- `GET /api/client/scenarios` — get available scenario switch options for the project.
- `GET /api/client/output-definitions` — get output field definitions (drives dashboard rendering).

### Step 5.2 — Implement JWT-Based Authentication

Use Spring Security with JWT (JSON Web Token) authentication:

- On login, verify credentials, generate a signed JWT with the user's ID, email, and role embedded as claims, with a defined expiry (e.g., 8 hours).
- Attach a JWT filter to the Spring Security filter chain that intercepts every request, extracts and validates the token, and sets the SecurityContext.
- Protect all `/api/admin/**` routes to require the ADMIN role.
- Protect all `/api/client/**` routes to require the CLIENT role.
- Implement project-level access control: a CLIENT user can only access projects they are associated with (checked in service layer, not just by role).

### Step 5.3 — Implement CORS Configuration

Configure CORS (Cross-Origin Resource Sharing) to allow requests only from the known React frontend origins (local dev URL, staging URL, production URL). Never allow wildcard origins in production.

### Step 5.4 — Design Standardised API Response Envelope

All API responses (success and error) must use a consistent JSON envelope:

```
{
  "success": true/false,
  "data": { ... },        // present on success
  "error": { ... },      // present on failure
  "timestamp": "...",
  "requestId": "..."     // for tracing in logs
}
```

### Step 5.5 — Implement API Rate Limiting and Request Logging

Add request logging (using a servlet filter or Spring AOP) that logs every request with its timestamp, method, path, user ID, and response time. This is critical for debugging formula-related issues in production. Implement basic rate limiting on the login endpoint to prevent brute-force attacks.

---

## Phase 6 — ReactJS Frontend Development

### Step 6.1 — Initialise the React Project

Use Create React App or Vite to initialise the React project. Install the following key dependencies:

- `react-router-dom` — for client-side routing between admin and client interfaces.
- `axios` — for HTTP communication with the Spring Boot backend.
- `recharts` or `chart.js` (via `react-chartjs-2`) — for data visualisation charts.
- A UI component library such as `Ant Design`, `Material UI`, or `Chakra UI` for consistent form components, tables, cards, and layout primitives.
- `react-query` (TanStack Query) — for server state management, caching, and background refetching.
- `react-hook-form` with `yup` or `zod` — for the admin input form with validation.
- `zustand` or React Context — for lightweight global state (authenticated user, current project).
- `recharts` — specifically recommended for financial time-series charts, waterfall charts, and bar charts typical in mining analysis.

### Step 6.2 — Set Up the Application Shell

Design the application shell with two distinct zones, controlled by routing:

- `/auth/login` — public login page.
- `/admin/*` — all admin routes, protected by ADMIN role guard.
- `/client/*` — all client routes, protected by CLIENT role guard.

Implement a Route Guard (a wrapper component) that checks the authenticated user's role on every route render. If the role doesn't match, redirect to login. Store the JWT in an `httpOnly` cookie (preferred for security) or in memory (not localStorage).

### Step 6.3 — Build Shared Services and Utilities

Before building any page, build the shared infrastructure:

- `apiService.js` — a configured Axios instance with the base URL, automatic JWT header injection via an Axios request interceptor, and a response interceptor that catches 401 responses and redirects to login.
- `authContext.js` — a React context that stores the current user's identity and role, provides login/logout functions.
- `formatUtils.js` — utility functions for formatting currency (e.g., "$12.5M"), percentages ("8.0%"), large numbers ("2,500,000 t/a"), and negative values in red. These formatting functions must use the output definitions from the API to apply correct units.
- Custom hooks: `useProject`, `useResults`, `useInputDefinitions`, `useScenarios` — each encapsulates the react-query logic for fetching its respective data.

---

## Phase 7 — Admin Interface Build

### Step 7.1 — Admin Layout and Navigation

Build the admin shell with a persistent sidebar navigation containing: Dashboard (overview of all projects), Project List, and within a selected project: Input Management, Computation Control, Result Preview, and Audit Log. The top header shows the logged-in admin's name and a logout button.

### Step 7.2 — Project Management Page

Build a projects list page showing all projects in a table with columns: Project Name, Client, Commodity, Status (Draft/Published/Archived), Last Computation Date, and action buttons (Open, Archive). Include a "New Project" button that opens a form to create a new project.

### Step 7.3 — Dynamic Admin Input Form — The Core Admin Feature

This is the most complex admin component. The form must be fully driven by the `input_definitions` data fetched from the API — no hardcoded fields in the React component.

**Form Structure:**
- Fetch `input_definitions` from `GET /api/admin/input-definitions` on page load.
- Group fields by their `grouping` property and render each group as a collapsible section (e.g., "Ore Body Parameters", "Capital Costs", "Operating Costs", "Financial Assumptions").
- Within each section, render fields in `displayOrder` sequence.
- For each field, render the appropriate input control based on the `inputType` property: a numeric input with step validation for `number` type, a percentage input with a `%` suffix for `percentage` type, a dropdown select for `dropdown` type, etc.
- Display the field's `unit` as a suffix label next to the input.
- Display the field's `tooltip` description as a hover info icon.
- Display min/max range hints below each input.

**Form Validation:**
- Use `react-hook-form` with validation rules derived from the `input_definitions` (min, max, required status).
- Show inline validation errors below each field immediately on blur.
- Disable the save button until all fields pass validation.

**Form Actions:**
- "Load Previous Snapshot" — a dropdown that lists historical snapshots by label and date; selecting one pre-populates the form with those values for modification.
- "Save as New Version" — saves the current form values as a new input snapshot via `POST /api/admin/projects/{projectId}/inputs`. Prompts admin to enter a version label.
- Shows the current version label and timestamp at the top of the form.

**Change Highlighting:**
- Track the initial loaded values. Highlight in yellow any field that has been modified since loading. This helps admins identify what they have changed before saving.

### Step 7.4 — Computation Control Panel

After saving inputs, show a Computation Control panel:

- Displays the current saved snapshot's label, version number, and timestamp.
- Shows the status of the last computation: "Never computed", "Up to date", or "Inputs changed since last computation".
- A prominent "Run Computation" button triggers `POST /api/admin/projects/{projectId}/compute`.
- During computation, show a progress indicator (the computation may take several seconds for complex models).
- On completion, show a summary: "Computation complete. Results generated for X scenarios."
- On failure, show the specific module and formula where the error occurred.

### Step 7.5 — Result Preview Panel (Admin Only)

Allow admins to preview the computed results across all scenarios before publishing to the client. This shows the same visualisations as the client dashboard but labelled as "Admin Preview — Not Published". A "Publish to Client" button triggers `PUT /api/admin/projects/{projectId}/publish`, making the latest results visible to the associated client user.

### Step 7.6 — Audit Log View

A read-only table showing all historical input changes for the project. Columns: Timestamp, Admin User, Field Changed, Previous Value, New Value, Snapshot Version. Support filtering by date range and sorting by timestamp.

---

## Phase 8 — Client Interface Build

### Step 8.1 — Client Layout and Navigation

The client interface is entirely read-only. Build a clean, professional layout with:

- A header with the client's project name, the mining company logo, and a logout button.
- A top navigation bar with tabs corresponding to result sections (e.g., "Project Summary", "Financial Performance", "Cost Breakdown", "Sensitivity Analysis", "Annual Schedule").
- A persistent "Scenario Controls" panel (a compact bar or side panel) containing the dropdown switches for client-selectable scenarios.

### Step 8.2 — Scenario Switch Controls

At the top of the client dashboard, render the scenario switches:

- Fetch available `scenarios` from the API.
- Render each scenario group as a segmented button group or a styled dropdown (e.g., "Mining Method: [Open Pit] [Underground]", "Processing Route: [Heap Leach] [CIL]").
- When the client changes a selection, the entire dashboard re-fetches results using the new scenario key combination via `GET /api/client/projects/{projectId}/results?scenario={key}`.
- Show a subtle loading overlay on the charts during the re-fetch. Because results are pre-computed, this re-fetch is fast.
- The selected scenario combination is stored in component state (or URL query params so the view is shareable/bookmarkable).

### Step 8.3 — Project Summary Tab — KPI Cards

Design the first tab as a high-impact summary. Display key output metrics as large KPI cards:

- Each card shows the metric label, the value (formatted with unit), and optionally a comparison indicator vs. a benchmark (if the model produces one).
- Group cards thematically: "Project Scale" (mine life, ore tonnes, production per year), "Financial Returns" (NPV, IRR, Payback Period), "Cost Profile" (All-In Sustaining Cost, Total Capex).
- Use colour coding: green for metrics exceeding a target, yellow for marginal, red for below threshold (only if the model defines targets).
- Cards should be responsive — 4 per row on desktop, 2 on tablet, 1 on mobile.

### Step 8.4 — Financial Performance Tab

This tab contains the primary financial charts:

**Annual Cash Flow Waterfall or Bar Chart:**
A grouped bar chart showing, for each year of the project: Revenue (positive), Operating Costs (negative), Capital Costs (negative), Taxes (negative), and Net Free Cash Flow (positive/negative). Uses Recharts `ComposedChart` with bars and a line for cumulative cash flow.

**Cumulative Cash Flow Curve:**
A line chart showing the cumulative free cash flow over project life. The x-axis is project year, the y-axis is cumulative cash flow in USD millions. The point where the line crosses zero is the payback period. Visually annotate the payback year with a vertical dashed line and a label.

**Revenue Breakdown Pie or Donut Chart:**
Shows the composition of revenue or cost structure in a specific year or over the mine life.

**NPV Sensitivity Tornado Chart:**
A horizontal bar chart showing how much the NPV changes for a ±10% or ±15% change in each key input variable (gold price, operating cost, discount rate, capital cost, ore grade, recovery rate). Bars extend right (positive sensitivity) or left (negative sensitivity) from a central zero axis. This is one of the most valued outputs in any techno-economic study.

### Step 8.5 — Cost Breakdown Tab

**Operating Cost Breakdown Stack:**
A stacked bar chart showing the components of operating cost per tonne per year: mining, processing, G&A, royalties. Use a consistent colour palette across all charts.

**Capital Cost Profile:**
A bar chart or area chart showing pre-production capital and sustaining capital by year.

**Cost Benchmarking Table (if data available):**
A formatted table showing the project's key cost metrics against industry benchmarks (if the Excel model contains benchmark data).

### Step 8.6 — Annual Production Schedule Tab

A table and chart showing the year-by-year production schedule: Ore Mined, Waste Mined, Strip Ratio, Ore Grade, Metal Produced. The table is sortable by year. A dual-axis line chart overlays metal production and ore grade over project life.

### Step 8.7 — Sensitivity Analysis Tab

A dedicated tab for sensitivity analysis visuals:

- The Tornado Chart (described in Step 8.4) is repeated here at larger scale with more inputs shown.
- A Spider/Radar chart showing NPV at −20%, −10%, 0%, +10%, +20% of each key variable simultaneously.
- An option for the client to view a "Scenario Comparison Table" — a table that puts Base Case, Optimistic Case, and Pessimistic Case side by side for all key output metrics.

### Step 8.8 — Data Export for Client (Optional but Valuable)

Add a "Download Summary Report" button on the client dashboard that triggers a backend endpoint (`GET /api/client/projects/{projectId}/report`) which generates a PDF summary of the key results and charts, returned as a file download. This is optional for the first release but highly valued by clients.

---

## Phase 9 — Integration & End-to-End Testing

### Step 9.1 — Formula Regression Testing (Critical)

Using the test cases prepared in Step 1.7, run every known input set through the backend formula engine and compare each output value against the Excel-produced value. Create a dedicated test endpoint (admin-only, disabled in production) that accepts a full input set and returns all intermediate and final computed values for debugging. Every discrepancy — no matter how small — must be investigated and resolved before proceeding.

### Step 9.2 — API Integration Testing

Write Spring Boot integration tests (using `@SpringBootTest` and `MockMvc`) for every REST endpoint. Test: correct HTTP status codes, correct response body structure, authentication enforcement (verify that CLIENT tokens cannot reach ADMIN endpoints), input validation rejection, and computation trigger flow end-to-end.

### Step 9.3 — Frontend Component Testing

Use React Testing Library to test individual components: form validation behaviour, scenario switch state changes, correct chart data mapping, role-based route guard enforcement.

### Step 9.4 — End-to-End User Journey Testing

Use Cypress or Playwright to write automated end-to-end tests simulating real user journeys:

- **Admin journey**: Log in as admin → select project → fill input form with known values → save snapshot → trigger computation → verify success message → publish results.
- **Client journey**: Log in as client → see project summary → verify KPI values match expected → switch scenario → verify charts update → verify access to admin routes is blocked.

### Step 9.5 — Cross-Browser and Responsiveness Testing

Test the client dashboard on Chrome, Firefox, Safari, and Edge. Test on desktop (1920px wide), laptop (1280px), and tablet (768px) screen widths. Charts must render correctly at all breakpoints.

### Step 9.6 — Performance Testing

Test the computation trigger endpoint: measure how long computation takes for the full formula engine run. If it exceeds 3 seconds, consider moving computation to an asynchronous background job using Spring's `@Async` with a thread pool, and implement a polling mechanism in the admin UI to check job status.

Test the client dashboard page load: measure time from page load to visible charts. Target under 2 seconds on a standard connection.

---

## Phase 10 — Deployment & DevOps

### Step 10.1 — Environment Configuration Strategy

Define three environments: Development (local machines), Staging (cloud server for testing), Production (live server for clients). Each environment has its own `application-{profile}.yml` file in Spring Boot and its own `.env` file for the React build. Never commit any credential, connection string, or secret to version control. Use environment variables or a secrets manager.

### Step 10.2 — Spring Boot Build and Containerisation

Configure the Maven `pom.xml` with the Spring Boot Maven plugin to produce a fat JAR. Write a Dockerfile for the Spring Boot application: use a multi-stage build (first stage compiles with Maven, second stage runs the JAR on a minimal JRE base image). Tag Docker images with the Git commit hash for traceability.

### Step 10.3 — React Build and Serving

Run `npm run build` to produce an optimised static bundle. Serve the React build from an Nginx container. Write an Nginx configuration that serves the React app for all routes (to support React Router's client-side routing) and proxies API requests to the Spring Boot container.

### Step 10.4 — Database Deployment

Run MongoDB either as a managed cloud service (MongoDB Atlas is recommended — it provides automated backups, built-in monitoring, and easy scaling) or as a self-hosted container. Ensure automated daily backups are configured. Restrict network access to the MongoDB instance so only the Spring Boot application's server IP can connect.

### Step 10.5 — Docker Compose for Local Development

Write a `docker-compose.yml` that spins up all three services together for local development: the Spring Boot backend, the React Nginx frontend, and a MongoDB container. Include a seeding service that populates the `input_definitions`, `output_definitions`, and `scenarios` collections with their static metadata on first startup.

### Step 10.6 — CI/CD Pipeline

Set up a CI/CD pipeline using GitHub Actions, GitLab CI, or Jenkins:

- **On every pull request**: Run Maven tests (including formula regression tests), run React linting and tests, build Docker images.
- **On merge to `develop` branch**: Deploy to Staging environment automatically.
- **On merge to `main` branch (or a tagged release)**: Deploy to Production after manual approval.

### Step 10.7 — Monitoring and Alerting

Configure Spring Boot Actuator endpoints (`/actuator/health`, `/actuator/metrics`) and connect to a monitoring tool (Grafana + Prometheus, or a managed service like Datadog). Set up alerts for: application down, API response time exceeding 5 seconds, computation job failures, MongoDB connection errors.

---

## Phase 11 — Maintenance & Iteration

### Step 11.1 — Formula Change Process

When the domain expert needs to update a formula in the model (commodity prices change, regulatory conditions change, methodology is refined), the process must be formal:

1. Domain expert documents the formula change in the specification document with a change reason and date.
2. Developer updates the relevant Java formula module.
3. Unit test is updated to reflect the new expected output.
4. All regression tests are re-run.
5. The change is deployed as a versioned release.
6. Previously computed results are not retroactively changed — they are historical records. New computations will use the new formula.

### Step 11.2 — Adding New Input Fields

If a new Category A input field needs to be added:

1. Add a new document to the `input_definitions` MongoDB collection via a migration script.
2. Update the relevant formula module to consume the new input.
3. Update input validation.
4. The admin form will automatically render the new field because it is driven by `input_definitions`.
5. Historical snapshots that do not contain the new field must be handled gracefully (use the new field's default value if absent).

### Step 11.3 — Adding New Client-Facing Outputs

If a new output metric needs to be surfaced to the client:

1. Add a new document to `output_definitions` MongoDB collection.
2. Implement the formula for the new output in the appropriate engine module.
3. Add the new output to the formula engine's result object.
4. The client dashboard component must be updated to render the new output — this requires a frontend code change.

### Step 11.4 — Adding New Projects and Clients

Because the system is built project-aware from the start:

1. Admin creates a new project document.
2. Admin creates a client user account and associates it with the project.
3. Admin fills in inputs for the new project and triggers computation.
4. Admin publishes results.
5. Client logs in and immediately sees their project.

No code changes are needed to onboard new projects or clients.

---

## Architecture Diagram (Text Representation)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                                     │
│                                                                             │
│   ┌─────────────────────────────┐    ┌──────────────────────────────────┐   │
│   │      ADMIN INTERFACE        │    │       CLIENT INTERFACE           │   │
│   │  (React — /admin/*)         │    │   (React — /client/*)            │   │
│   │                             │    │                                  │   │
│   │  ┌─────────────────────┐    │    │  ┌────────────────────────────┐  │   │
│   │  │ Dynamic Input Form  │    │    │  │ Scenario Switch Controls   │  │   │
│   │  │ (driven by API)     │    │    │  │ (Dropdown/Toggle Buttons)  │  │   │
│   │  ├─────────────────────┤    │    │  ├────────────────────────────┤  │   │
│   │  │ Computation Trigger │    │    │  │ KPI Summary Cards          │  │   │
│   │  ├─────────────────────┤    │    │  ├────────────────────────────┤  │   │
│   │  │ Result Preview      │    │    │  │ Cash Flow Charts           │  │   │
│   │  ├─────────────────────┤    │    │  ├────────────────────────────┤  │   │
│   │  │ Audit Log           │    │    │  │ Tornado / Sensitivity      │  │   │
│   │  └─────────────────────┘    │    │  ├────────────────────────────┤  │   │
│   │                             │    │  │ Production Schedule        │  │   │
│   │  Role: ADMIN                │    │  │ Role: CLIENT (read-only)   │  │   │
│   └──────────────┬──────────────┘    └──────────────┬───────────────┘   │   │
│                  │  HTTPS (JWT)                      │  HTTPS (JWT)      │   │
└──────────────────┼───────────────────────────────────┼───────────────────┘   
                   │                                   │
         ┌─────────▼───────────────────────────────────▼──────────┐
         │              NGINX REVERSE PROXY                        │
         │  (Serves React static build, proxies /api/* to Spring)  │
         └─────────────────────────┬────────────────────────────────┘
                                   │
         ┌─────────────────────────▼────────────────────────────────┐
         │            SPRING BOOT APPLICATION (Maven)                │
         │                                                           │
         │  ┌────────────────────────────────────────────────────┐  │
         │  │              REST CONTROLLERS                       │  │
         │  │  /api/auth/*   /api/admin/*   /api/client/*        │  │
         │  └───────────────────────┬────────────────────────────┘  │
         │                          │                               │
         │  ┌────────────────────────▼────────────────────────────┐  │
         │  │              SPRING SECURITY LAYER                   │  │
         │  │  JWT Filter → Role Guard → Project Access Control    │  │
         │  └───────────────────────┬────────────────────────────┘  │
         │                          │                               │
         │  ┌────────────────────────▼────────────────────────────┐  │
         │  │              SERVICE LAYER                            │  │
         │  │  ProjectService  InputService  ComputationService    │  │
         │  │  ResultService   UserService   AuditService          │  │
         │  └────────────┬─────────────────────────────┬──────────┘  │
         │               │                             │             │
         │  ┌────────────▼───────────┐   ┌────────────▼───────────┐  │
         │  │   FORMULA ENGINE       │   │  REPOSITORY LAYER       │  │
         │  │                        │   │  (Spring Data MongoDB)  │  │
         │  │  Orchestrator          │   │                         │  │
         │  │  ├─ OreBodyModule      │   │  ProjectRepository      │  │
         │  │  ├─ RevenueModule      │   │  InputSnapshotRepo      │  │
         │  │  ├─ CapexModule        │   │  ComputedResultRepo     │  │
         │  │  ├─ OpexModule         │   │  UserRepository         │  │
         │  │  ├─ TaxModule          │   │  AuditLogRepository     │  │
         │  │  ├─ CashFlowModule     │   │  DefinitionRepository   │  │
         │  │  ├─ ValuationModule    │   │                         │  │
         │  │  └─ SensitivityModule  │   │                         │  │
         │  └────────────────────────┘   └────────────┬────────────┘  │
         │                                            │              │
         └────────────────────────────────────────────┼──────────────┘
                                                      │
         ┌────────────────────────────────────────────▼──────────────┐
         │                    MONGODB DATABASE                        │
         │                                                           │
         │  Collections:                                             │
         │  ├── projects           (project identity & status)       │
         │  ├── input_snapshots    (versioned admin input sets)      │
         │  ├── computed_results   (pre-computed formula outputs)    │
         │  ├── input_definitions  (admin form schema metadata)      │
         │  ├── output_definitions (client chart schema metadata)    │
         │  ├── scenarios          (client switch options)           │
         │  ├── users              (admin & client accounts)         │
         │  └── audit_logs         (full change history)             │
         └────────────────────────────────────────────────────────────┘
```

---

## Key Design Principles — Summary

| Principle | Decision |
|---|---|
| Formula ownership | All formulas live in Spring Boot Java code only. Never in the database, never in the frontend. |
| Computation model | Pre-computed on admin trigger, stored in MongoDB, served instantly to clients. |
| Schema flexibility | Admin form and client dashboard driven by metadata collections, not hardcoded UI. |
| Data integrity | Input snapshots are immutable once saved. Computation results reference a specific snapshot. |
| Security boundary | CLIENT role cannot reach any /admin/* endpoint. Client cannot see input values or intermediate formula results. |
| Auditability | Every admin input change is logged with before/after values and the acting user. |
| Precision | All financial computations use BigDecimal with explicit rounding. Validated against Excel outputs. |
| Extensibility | New projects, clients, inputs, and outputs can be added without code changes (inputs/outputs) or with minimal code changes (new formula modules). |

---

*Document Version 1.0 — Prepared for internal development team reference. All formula translations must be validated against the Excel model test suite before each release.*
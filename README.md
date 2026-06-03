# Technical Workflow: Converting an Excel Techno-Economic Mining Model into a Full-Stack Web Application
### Stack: Node.js (Express) · Python (Formula Engine) · MongoDB · ReactJS (Vite + TS)

---

## Table of Contents

1. [Phase 0 — Project Scoping & Team Setup](#phase-0--project-scoping--team-setup)
2. [Phase 1 — Excel Audit & Decomposition](#phase-1--excel-audit--decomposition)
3. [Phase 2 — Data Architecture & MongoDB Design](#phase-2--data-architecture--mongodb-design)
4. [Phase 3 — Python Formula Engine Design](#phase-3--python-formula-engine-design)
5. [Phase 4 — Node.js Express API Backend](#phase-4--nodejs-express-api-backend)
6. [Phase 5 — REST API Design](#phase-5--rest-api-design)
7. [Phase 6 — ReactJS Frontend Development](#phase-6--reactjs-frontend-development)
8. [Phase 7 — Admin & Recalculation Controls](#phase-7--admin--recalculation-controls)
9. [Phase 8 — Client Dashboard & Visualizations](#phase-8--client-dashboard--visualizations)
10. [Phase 9 — Integration & E2E Testing](#phase-9--integration--e2e-testing)
11. [Phase 10 — Running the Project Locally](#phase-10--running-the-project-locally)
12. [Architecture Diagram](#architecture-diagram-text-representation)
13. [Key Design Principles](#key-design-principles--summary)

---

## Phase 0 — Project Scoping & Team Setup

### Stakeholders and Roles
- **Project Owner / Domain Expert** — Operates the Excel techno-economic mining model. Validates Python formula engine outputs.
- **Backend Developer (Node.js & Python)** — Responsible for the Express API wrapper, Python formula engine orchestrator, and MongoDB integrations.
- **Frontend Developer (ReactJS + Vite)** — Responsible for the React UI, dashboard visualisations (Recharts), and admin panels.
- **QA / Validation** — Audits the web application outputs against the original Excel sheets (`Option 3_15 Mtpa_rev1_smg opt2 quality.xlsx`).

### Project Scope
- **Input Sheets**: Extracting parameters from sheets like "Owner CAPEX", "MDO CAPEX", "Project CAPEX", "Owner OPEX", "Production", etc.
- **Dynamic Switches**: Multi-dimensional scenarios based on:
  - **Mining Mode**: Departmental vs. MDO Contractor.
  - **Pre-Tax / Pre-Finance**: Yes vs. No.
  - **Coal Price Type**: Commercial vs. NCI.
- **Database Storage**: Raw input schedules, metadata definitions, and pre-computed scenario results.

---

## Phase 1 — Excel Audit & Decomposition

### Cell Classification
- **Category A — Direct Inputs**: Hardcoded values (e.g., fuel cost, MDO contractor rates, swell factor) stored in dedicated MongoDB config collections.
- **Category B — System Constants**: Fixed coefficients (e.g., 18% GST, 10% DMF on royalty) defined directly in python calculation formulas.
- **Category C — Intermediate Calculations**: Dynamic calculations performed inside the Python formula engine (e.g., sustaining capex contingency, diesel expense per BCM).
- **Category D — Outputs**: Year-by-year cash flows, total CAPEX, operating cost summaries, and NPV/IRR, sent to the React frontend.

### Scenario Switch Combinations
The model maps a 3-dimensional switch matrix generating **8 distinct scenario combinations**:
1. Departmental | Pre-Tax: Yes | Price: Commercial
2. Departmental | Pre-Tax: Yes | Price: NCI
3. Departmental | Pre-Tax: No | Price: Commercial
4. Departmental | Pre-Tax: No | Price: NCI
5. MDO | Pre-Tax: Yes | Price: Commercial
6. MDO | Pre-Tax: Yes | Price: NCI
7. MDO | Pre-Tax: No | Price: Commercial
8. MDO | Pre-Tax: No | Price: NCI

---

## Phase 2 — Data Architecture & MongoDB Design

Data is divided into three primary collection sets:

### 1. Hard Input Config Collections
Admins can tweak these base rates which feed the calculation engine:
- `salary_wages` (Annual CTC per grade)
- `working_regime` (Shifts, working days)
- `basic_consideration` (Mine life, targets)
- `density_swell_factor` (Material densities)
- `explosives` (Powder factor, explosive costs)
- `unit_rates_opcosts` (Diesel cost, electricity tariff)
- `maintainance_cost` (HEMM maintenance rates)
- `govt_fees_charges` (Royalty, DMF, NMET rates)
- `mdo_assumption` (MDO contract BCM rates)
- `safety_slope_stability` (Slope factors)

### 2. Base Schedules
Year-by-year input arrays loaded from the Excel model:
- `production_schedule` (Ore & waste volumes per year)
- `pre_operative_schedule` (Pre-production costs)
- `land_schedule` (Acquisition costs)
- `rr_schedule` (Rehabilitation & Resettlement)
- `coal_price_schedule` (Commercial vs NCI market pricing)
- `capex_breakups_schedule` (CHP, Civil, Railway siding initial costs)
- `fleet_replacement_schedule` (Equipment additions/replacements)
- `wages_schedule` (Base payroll costs)
- `owner_opex_schedule` (Consumables, power, administration)

### 3. Computed Results
- `computed_results`: Stores the pre-calculated metrics for all 8 scenarios.
  - Fields: `projectId`, `snapshotId`, `scenarioKey`, `switches`, `computedAt`, and a nested `results` object (with `capex`, `opex`, `government`, and `project_grand_total_opex` yearly schedules).

---

## Phase 3 — Python Formula Engine Design

The core calculations are executed by [calculate_tem.py](file:///Users/rishidas/Documents/Internship_SRK/TEM_Mining/TEM_interface/calculate_tem.py). 

### Calculation Pipeline:
1. **Load Schedules**: Pulls all base arrays from MongoDB into Python dicts.
2. **Retrieve Hard Inputs**: Reads configured coefficients (MDO rates, diesel pricing, contingency percentages) dynamically.
3. **Iterate Scenarios**: Loops through all 8 scenario configurations.
4. **Compute Modules**:
   - **CAPEX Module**: Calculates Initial & Sustaining capital for Owner and MDO. Calculates contingency (15%) and upfront offset adjustments.
   - **OPEX Module**: Computes diesel, spares, wages, explosives, power, and maintenance. If `Mining Mode = MDO`, it adds MDO contractor billing.
   - **Government & Taxes**: Calculates Revenue Sharing (applying upfront offsets), GST (18%), Royalties (14%), DMF (10% of royalty), NMET (3% of royalty), and Mine Closure provisioning.
   - **LOM Sums**: Compiles yearly project grand totals.
5. **Upsert Results**: Cleans previous computed documents and inserts the updated scenarios back into `computed_results`.

---

## Phase 4 — Node.js Express API Backend

The backend server in [server/server.js](file:///Users/rishidas/Documents/Internship_SRK/TEM_Mining/TEM_interface/server/server.js) acts as an API gateway.

- **Stack**: Node.js, Express, MongoDB Node.js Driver, dotenv, cors.
- **Recalculation Trigger**: The server exposes a `POST /api/recalculate` route.
  - When hit, it uses Node's `child_process.exec` to run `python3 calculate_tem.py`.
  - It captures standard output/error and returns the calculation status dynamically back to the client UI.
- **Port**: Listens on port `4000`.

---

## Phase 5 — REST API Design

Key API endpoints defined in the server:

- `GET /api/scenarios` — Returns a list of all computed scenario keys and their switch settings.
- `GET /api/scenarios/:key` — Returns the detailed yearly schedules and computed results for a specific scenario key.
- `GET /api/schedules/:collection` — Reads raw schedules (e.g. `production_schedule`, `land_schedule`).
- `GET /api/hard-inputs` — Fetches parameters from all hard input collections.
- `POST /api/admin/update-input` — Updates a single hard input value (e.g., changes bulk diesel rate).
- `POST /api/recalculate` — Triggers the Python execution engine to recompute the entire model.
- `GET /api/capex-breakdown` — Computes aggregate LOM values for initial vs. sustaining CAPEX (used by React UI pie charts).

---

## Phase 6 — ReactJS Frontend Development

The frontend is a modern SPA located in the `frontend/` directory.

- **Build Tool**: Vite + TypeScript.
- **Dependencies**: React Router DOM (Navigation), Axios (API Client), Recharts (Visualizations), CSS Variables (Theme styling).
- **Theme**: Premium dark mode design with sleek glassmorphism panels, customized layouts, and micro-interactions.
- **Dev Port**: Runs on [http://localhost:5173/](http://localhost:5173/).

---

## Phase 7 — Admin & Recalculation Controls

Admins have full visibility and write access to the parameters:
1. **Interactive Sheets**: View raw schedules and data inputs imported directly from the Excel workbook.
2. **Inputs Update Panel**: Edit key parameters (e.g., diesel prices, salary rates).
3. **Engine Recalculate Trigger**: When inputs are updated, the admin clicks the **"Recalculate Model"** button, which sends a POST request to the API, executes the Python script, and saves the new calculations into MongoDB.

---

## Phase 8 — Client Dashboard & Visualizations

 SURFACES the pre-calculated outputs using responsive Recharts:
- **KPI Summary Cards**: Total Capital Cost (LOM), Average Operating Cost, Project Life, Peak Production.
- **Cash Flow Analysis**: Grouped bar charts showing Revenue, Capex, Opex, and Net Free Cash Flow.
- **CAPEX Breakdown**: Interactive Donut/Pie charts mapping Pre-operative, Land, initial HEMM, and sustaining replacement costs.
- **Scenario Compare Table**: Displays base outputs side-by-side. Changing the toggles dynamically refreshes the charts instantly since data is pre-computed.

---

## Phase 9 — Integration & E2E Testing

1. **Formula Audit**: The Python formula engine results have been compared with the Excel direct computations cell-by-cell.
2. **Port verification**: Script checks verify that port `4000` (API) and port `5173` (Frontend) are accessible and free before starting.
3. **Data Integrity**: Schemas are checked to ensure default configurations fallback safely when parameters are missing.

---

## Phase 10 — Running the Project Locally

### Prerequisites
- Node.js (v18+)
- Python 3.x
- MongoDB (Atlas instance or Local server)

### 1. Environment Setup
Create a `.env` file inside `server/` with the following variables:
```env
MONGODB_URI=your_mongodb_connection_string
DATABASE_NAME=tem
PORT=4000
```

### 2. Starting the Backend Server
Navigate to the `server/` folder, install dependencies, and run:
```bash
cd server
npm install
node server.js
```
The console will log:
`Connected to MongoDB database: tem`
`TEM API server running on http://localhost:4000`

### 3. Starting the Frontend
Navigate to the `frontend/` folder, install dependencies, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

---

## Architecture Diagram (Text Representation)

```
                       ┌──────────────────────────────────────────────────┐
                       │                   CLIENT BROWSER                 │
                       │                                                  │
                       │     React App Dashboard (http://localhost:5173)  │
                       │     ├── Recharts Data Visualization              │
                       │     ├── Scenario Toggles & Admin Inputs          │
                       │     └── Axios Client                             │
                       └───────────────┬──────────────────────────▲───────┘
                                       │                          │
                                 POST /api/recalculate      GET /api/scenarios
                                       │                          │
                       ┌───────────────▼──────────────────────────┴───────┐
                       │                  NODE.JS SERVER                  │
                       │                                                  │
                       │     Express API Gateway (http://localhost:4000)  │
                       │     └── REST Route Handlers                      │
                       └───────────────┬──────────────────────────────────┘
                                       │
                        executes python3 calculate_tem.py
                                       │
                       ┌───────────────▼──────────────────────────────────┐
                       │              PYTHON FORMULA ENGINE               │
                       │                                                  │
                       │     calculate_tem.py                             │
                       │     └── Calculates 8 Scenario Combinations       │
                       └───────┬──────────────────────────────────▲───────┘
                               │                                  │
                       Writes Computed                    Reads Configuration
                           Results                            & Schedules
                               │                                  │
                       ┌───────▼──────────────────────────────────┴───────┐
                       │                 MONGODB ATLAS                    │
                       │                                                  │
                       │     Database: tem                                │
                       │     ├── computed_results (Outputs)               │
                       │     ├── raw schedules (Inputs)                   │
                       │     └── hard-input configs                       │
                       └──────────────────────────────────────────────────┘
```

---

## Key Design Principles — Summary

| Principle | Decision |
|---|---|
| **Engine Isolation** | Complex mathematical formulas live in Python (`calculate_tem.py`) for readability and speed. |
| **API Wrapper** | Node.js handles HTTP routing, async process triggers, and client JSON marshalling. |
| **Pre-Computation** | Scenarios are pre-computed and stored in MongoDB. Dashboards switch instantly without real-time compute lag. |
| **Schema Integrity** | The database acts as a single source of truth for Excel formulas, ensuring no drift between Excel and Web app. |
| **Precision** | All calculated financials are rounded and compared against the Excel workbook. |

---

# Internship Presentation
## Digitising the Techno-Economic Mining Model (TEM)
### From Excel Workbook to a Secure, Role-Based Full-Stack Web Application

**Intern:** Rishi Das  
**Organisation:** SRK Consulting (India) Pvt. Ltd.  
**Project Reference:** IN1411 — Radhikapur Coal Block, Option 3 (15 Mtpa)  
**Internship Duration:** 9 Weeks (June – August 2026)  
**Tech Stack:** React (Vite + TypeScript) · Node.js (Express) · Python · MongoDB Atlas

---

## Table of Contents

1. [Introduction to SRK Consulting & the TEM](#1-introduction-to-srk-consulting--the-tem)
2. [Week 1 — Introduction to the Techno-Economic Model](#week-1--introduction-to-the-techno-economic-model)
3. [Week 2 — Understanding TEM Architecture & System Design](#week-2--understanding-tem-architecture--system-design)
4. [Week 3 — Building the Baseline Web Interface](#week-3--building-the-baseline-web-interface)
5. [Week 4 — MongoDB Integration & Role-Based Authentication](#week-4--mongodb-integration--role-based-authentication)
6. [Week 5 — Python Calculation Engine: Root-to-Result Flow](#week-5--python-calculation-engine-root-to-result-flow)
7. [Week 6 — Interactive Dashboard, UI/UX & Scenario Engine](#week-6--interactive-dashboard-uiux--scenario-engine)
8. [Week 7 — Validation, Testing & Mathematical Integrity](#week-7--validation-testing--mathematical-integrity)
9. [Week 8 — Final Changes, Upgrades & Presentation Preparation](#week-8--final-changes-upgrades--presentation-preparation)
10. [Week 9 — Further Improvements, Feedback & Project Handover](#week-9--further-improvements-feedback--project-handover)
11. [Key Takeaways & Learnings](#key-takeaways--learnings)

---

## 1. Introduction to SRK Consulting & the TEM

### About SRK Consulting

SRK Consulting is one of the world's leading independent groups of consulting companies in the natural resources sector. With over 45 offices across 20+ countries, SRK provides technical advisory and consulting services spanning:

- **Mining Engineering** — feasibility studies, mine design, operational support
- **Geology & Resource Estimation** — mineral resource modelling, exploration
- **Environment & Permitting** — environmental impact assessments
- **Infrastructure & Geotechnics** — tailing storage, slope stability

SRK India works primarily on coal and mineral projects, delivering detailed Techno-Economic Models (TEMs) to mine operators, government bodies, and investors as part of project feasibility and due diligence reports.

---

### What is a Techno-Economic Model (TEM)?

A **Techno-Economic Model (TEM)** is a comprehensive financial and operational model used to evaluate the **economic viability of a mining project** over its entire Life of Mine (LOM). It integrates:

- **Technical inputs** — production schedules, equipment fleet sizing, ore & waste volumes
- **Economic parameters** — capital costs (CAPEX), operating costs (OPEX), government fees
- **Financial outputs** — cash flows, NPV (Net Present Value), IRR (Internal Rate of Return), payback period

The TEM answers fundamental business questions:
> *"Is this mine worth building? How much will it cost? What return can investors expect?"*

---

### The Reference Project — Radhikapur Coal Block

The model used as the reference throughout this internship is:

| Parameter | Detail |
|---|---|
| **Project** | IN1411 — Radhikapur Coal Block |
| **Option** | Option 3 — 15 Mtpa (Mega Tonnes Per Annum) rated capacity |
| **Life of Mine** | 19 production years (+4 pre-production years) |
| **Total Coal Reserves** | ~226 Mt |
| **Total Waste** | ~557 Mbcm (Million Bank Cubic Metres) |
| **Mining Method** | Open-cast / Surface mining |
| **Client** | Rio Tinto |

The Excel workbook — `IN1411_Radhikapur_Option 3_15 Mtpa_rev1_20260612.xlsx` — was the **single source of truth** from which the entire web application was reverse-engineered and built.

---

## Week 1 — Introduction to the Techno-Economic Model

### Objectives of Week 1

The first week was primarily an **onboarding and learning phase** focused on understanding the domain — coal mine economics, the structure of TEM workbooks, and SRK's internal modelling conventions.

---

### Understanding the Excel TEM Structure

The TEM Excel workbook is a large, interconnected multi-sheet workbook. Key sheets identified:

| Sheet Category | Example Sheet Names | Role in Model |
|---|---|---|
| **Input Assumptions** | Owner CAPEX Inputs, MDO CAPEX Inputs | Hard-coded base rates (diesel, wages, royalty %) |
| **Production Schedule** | Production Schedule | Year-by-year ore, waste, partings, haul distances |
| **CAPEX Sheets** | Owner CAPEX, MDO CAPEX, Project CAPEX | Initial & sustaining capital calculations |
| **OPEX Sheets** | Owner OPEX, Project OPEX | Operating cost calculations (diesel, wages, etc.) |
| **Government & Taxes** | Revenue Sharing, Royalties, GST | Government levies and statutory charges |
| **Pre-Tax Cash Flow** | Pre-Tax, Pre-Finance | Project-level cash flow before debt/tax |
| **Post-Tax Cash Flow** | P&L, Tax, Borrowings, Cash Flow | Full financial model with IRR/NPV |

---

### Understanding the Life-of-Mine (LOM) Timeline

The model covers a **23-year timeline** in total:

```
Year -4  →  Year -3  →  Year -2  →  Year -1  |  Year 1  →  Year 2  → ... →  Year 19
|←── Pre-Production / Construction Phase ────→|←──── Active Mining & Production Phase ────→|
```

- **Years -4 to -1**: Pre-production — land acquisition, infrastructure setup, pre-operative CAPEX
- **Year 1**: Ramp-up begins — production starts at 2 Mtpa
- **Year 5**: Full rated capacity of 15 Mtpa is achieved
- **Year 19**: Mine closure, rehabilitation

---

### Key Concepts Learned in Week 1

| Concept | Description |
|---|---|
| **CAPEX (Capital Expenditure)** | One-time investments — HEMM fleet, CHP, railway sidings, civil works |
| **OPEX (Operating Expenditure)** | Recurring costs — diesel, wages, explosives, spares, maintenance |
| **Revenue Sharing** | Percentage of revenue paid to the government as bid premium (21%) |
| **Royalty** | 14% of CIL notified coal price paid to the state government |
| **DMF** | District Mineral Foundation — 10% of royalty, paid to local district |
| **NMET** | National Mineral Exploration Trust — 3% of royalty |
| **GST** | Goods & Services Tax — 18% applicable on revenue sharing and royalties |
| **NPV** | Net Present Value of the project's cash flows |
| **IRR** | Internal Rate of Return — key indicator for investor decision-making |
| **MDO** | Mine Developer & Operator — outsourced mining contractor model |
| **Departmental** | Owner-operated mining model (company owns all equipment and labour) |

---

### Mining Scenario Dimensions

A critical insight from Week 1 was that the TEM is **not a single model** — it computes results across **8 distinct scenario combinations** driven by three binary switches:

```
┌─────────────────────┬───────────────────────┬─────────────────────────────┐
│  Mining Mode        │  Pre-Tax / Pre-Finance │  Coal Price Type            │
├─────────────────────┼───────────────────────┼─────────────────────────────┤
│  Departmental       │  Yes (Pre-Tax Only)    │  Commercial Sale Price      │
│  MDO Contractor     │  No  (Full P&L)        │  NCI (Notified Coal Index)  │
└─────────────────────┴───────────────────────┴─────────────────────────────┘
```

This creates **2 × 2 × 2 = 8 scenarios**, each producing different CAPEX, OPEX, and cash flow results. A fourth dimension — **Coal Mining Machinery** (Surface Miner vs. Shovel-Dumper) — was later added to the web application.

---

## Week 2 — Understanding TEM Architecture & System Design

### Objectives of Week 2

Week 2 was dedicated to conducting a **deep technical audit of the Excel workbook** and translating all cell dependencies into a blueprint for the software system architecture.

---

### Excel Cell Classification

After carefully tracing every formula in the workbook, all parameters were classified into four categories:

| Category | Type | Handling in Web App |
|---|---|---|
| **Category A — Direct Inputs** | Hardcoded base rates (diesel price, royalty %, wage grades) | Stored in MongoDB hard input collections; editable by Admin |
| **Category B — System Constants** | Fixed coefficients embedded in formulas (18% GST, density 1.72 t/m³) | Hardcoded in Python calculation engine |
| **Category C — Intermediate Calculations** | Derived mid-step values (fleet sizing, CAPEX contingency) | Computed inside Python engine at runtime |
| **Category D — Outputs** | Year-by-year schedules, totals, NPV, IRR | Stored in MongoDB computed_results; served to frontend |

---

### Data Flow Architecture

The core architectural insight was the **separation of concerns** between three tiers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                               │
│   React + Vite (TypeScript)                                         │
│   • Scenario toggles    • Interactive charts    • Admin panel       │
└─────────────────────────────────────┬───────────────────────────────┘
                                      │  REST API (Axios)
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NODE.JS API SERVER                             │
│   Express.js (Port 4000)                                            │
│   • REST route handlers  • Auth middleware  • Process spawner       │
└──────────────────────┬──────────────────────────────────────────────┘
                       │  child_process.exec()
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   PYTHON FORMULA ENGINE                             │
│   calculate_tem.py                                                  │
│   • Reads inputs from MongoDB                                       │
│   • Executes 8 scenario calculations                                │
│   • Writes computed results back to MongoDB                         │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MONGODB ATLAS                                  │
│   Database: tem                                                     │
│   • Hard input collections (13 collections)                         │
│   • Schedule collections (9 schedule collections)                   │
│   • computed_results (8 scenario documents)                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

### MongoDB Schema Design

The database was designed around three logical groups:

**Group 1 — Hard Input Config Collections** (Admin-editable parameters):
```
salary_wages          → Annual CTC per employee grade (32 grades)
working_regime        → Shift structure, working days
basic_consideration   → Mine life, rated capacity, start dates
density_swell_factor  → Material densities, swell factors
explosives            → Powder factors, explosive costs
unit_rates_opcosts    → Diesel price, power tariff, contingency %
maintainance_cost     → HEMM maintenance % rates
operational_para      → Sustaining CAPEX %, additional fleet %
govt_fees_charges     → Revenue sharing %, royalty %, GST %, tax %
payment_assumption    → Debt %, interest rates, moratorium period
mdo_assumption        → MDO BCM rates for each material type
safety_slope_stability → Slope monitoring equipment costs
production_schedule_params → Partings %, bench geometry parameters
```

**Group 2 — Schedule Collections** (Year-by-year arrays, Years -4 to 19):
```
production_schedule       → Ore, waste, GCV, haul distances
pre_operative_schedule    → Pre-production cost schedule
land_schedule             → Land acquisition cost schedule
rr_schedule               → Rehabilitation & Resettlement schedule
coal_price_schedule       → Commercial & NCI coal price per year
capex_breakups_schedule   → CHP, railway siding, civil works costs
fleet_replacement_schedule → HEMM initial purchase & replacement
wages_schedule            → Annual payroll cost schedule
owner_opex_schedule       → Power, consumables, admin costs
```

**Group 3 — Computed Results**:
```
computed_results → 8 documents (one per scenario), each containing:
  • projectId, snapshotId, scenarioKey, computedAt
  • switches: { mining_mode, pre_tax_pre_finance, coal_price_type }
  • results: { capex, opex, government, cashflow, pnl, borrowings }
```

---

### High-Level System Workflow Design

A detailed high-level architecture diagram was prepared covering the full envisioned system scope, including:

- External APIs & Data Services (Exchange Rate, Diesel Price APIs)
- Backend Services & Calculation Engine (Centralised Formula Engine, Scenario Versioning)
- API Gateway & Service Mesh (CAPEX API, OPEX API, IRR/NPV API, Fleet Analysis API)
- Frontend Layer — Client Portal & Admin/Engineer Portal
- Analytics & Reporting Layer (Sensitivity Analysis, What-If Engine, PDF Export)
- DevOps & Cloud Infrastructure (CI/CD, Kubernetes, Load Balancer)
- Security & Authentication Layer (JWT + Auth0, Role-Based Access, Audit Trail)
- Feedback & Improvement Loops

This architecture served as the **north star** for incremental development throughout the internship.

---

## Week 3 — Building the Baseline Web Interface

### Objectives of Week 3

With the architecture finalised, Week 3 focused on **standing up the skeleton of the full-stack application** — the project structure, the Node.js API server, and a static React frontend dashboard.

---

### Project Folder Structure

```
TEM_Mining/
├── TEM_interface/
│   ├── server/           ← Node.js Express API server
│   │   └── server.js
│   ├── frontend/         ← React (Vite + TypeScript) SPA
│   │   └── src/
│   │       ├── pages/    ← Dashboard.tsx, AdminPage.tsx
│   │       ├── components/ ← Charts, tables, KPI cards
│   │       ├── hooks/    ← useScenarioData (data-fetching)
│   │       ├── types.ts  ← Shared TypeScript interfaces
│   │       └── index.css ← Global design system (CSS variables)
│   ├── calculate_tem.py  ← Python calculation engine
│   ├── import_tem_data.py ← Excel-to-MongoDB ETL script
│   └── Hard_Input/       ← JSON seed files for hard inputs
```

---

### Static Dashboard — Key Components Built

The baseline frontend was built using **React + Vite + TypeScript**, with the following components scaffolded:

| Component | Purpose |
|---|---|
| `App.tsx` | Root layout — header with SRK logo, navigation bar, routing |
| `Dashboard.tsx` | Main client view — KPI cards, charts, scenario controls |
| `AdminPage.tsx` | Admin view — hard input tables, schedule grids, recalculate trigger |
| `ScenarioSwitches.tsx` | Toggle controls for Mining Mode, Pre-Tax, Coal Price Type |
| `KpiCard.tsx` | Summary metric cards (Total CAPEX, Average OPEX, IRR, NPV) |
| `CapexPieChart.tsx` | CAPEX component breakdown (donut chart using Recharts) |
| `OpexBarChart.tsx` | Operating cost category breakdown (bar chart) |
| `GovtDonutChart.tsx` | Government levies breakdown (donut chart) |
| `YearlyAreaChart.tsx` | Year-by-year CAPEX + OPEX stacked area chart |
| `BreakdownTable.tsx` | Tabular view of yearly cost schedules |
| `ProductionScheduleTable.tsx` | Full production schedule grid (scrollable) |

---

### Design System

A premium dark-mode design was established from the start, using **CSS custom properties (variables)** for consistency:

```css
/* Core Design Tokens */
--bg-base:    #0f0f17   /* Deep dark background     */
--bg-card:    #1a1a2e   /* Card surface             */
--accent-primary: #6366f1  /* Indigo — primary action  */
--accent-violet:  #8b5cf6  /* Violet — secondary       */
--accent-emerald: #10b981  /* Emerald — positive trend */
--accent-rose:    #f43f5e  /* Rose — negative / alert  */
```

Visual features included:
- **Glassmorphism panels** — frosted glass card effect with `backdrop-filter: blur`
- **Gradient borders** on active elements
- **Micro-animations** on hover, load, and state transitions
- **Google Fonts — Inter** for professional typography

---

### Node.js Server — First Endpoints

The Express server was set up with the first working endpoints:

```
GET  /api/scenarios           → List all 8 computed scenario keys
GET  /api/scenarios/:key      → Full result for a specific scenario
GET  /api/schedules/:collection → Raw schedule data from MongoDB
GET  /api/hard-inputs         → All hard input parameters
```

---

## Week 4 — MongoDB Integration & Role-Based Authentication

### Objectives of Week 4

Week 4 focused on two critical foundations: **populating the MongoDB database** from the Excel workbook, and implementing the **role-based access control system** to separate the client view from the admin view.

---

### Excel-to-MongoDB ETL Pipeline

An **ETL (Extract, Transform, Load) script** — `import_tem_data.py` — was written to systematically extract all data from the Excel workbook into MongoDB.

**Extraction process:**
1. Opens the `.xlsx` file using `openpyxl`
2. Parses each sheet row-by-row, identifying header rows and data rows
3. Maps column indices to the year headers: `[-4, -3, -2, -1, 1, 2, ..., 19]`
4. Converts all cell values to clean Python floats (handling `None`, formula strings)
5. Constructs MongoDB documents with the schema: `{ item, unit, lom_total_or_average, yearly_values: { "-4": 0.0, ..., "19": 0.0 } }`
6. Upserts each document into the appropriate MongoDB collection

**Hard Input JSON files** (13 files in `/Hard_Input/`) were created as structured seed data, capturing all base assumptions from the Excel input tabs.

---

### MongoDB Collections Populated

After running the ETL pipeline, the following collections were populated:

| Collection | Documents | Description |
|---|---|---|
| `salary_wages` | 36 | Annual CTC per grade (Executive, Statutory, Staff) |
| `working_regime` | 13 | Shift hours, working days, monsoon impact |
| `basic_consideration` | 10 | Mine life, capacity, block area |
| `density_swell_factor` | 4 | Coal and waste density & swell factors |
| `explosives` | 9 | Powder factor, explosive unit costs |
| `unit_rates_opcosts` | 10 | Diesel, power, contingency %, admin cost |
| `maintainance_cost` | 4 | Civil, electrical, mechanical maintenance % |
| `govt_fees_charges` | 14 | Revenue sharing, royalty, GST, CSR rates |
| `mdo_assumption` | 5 | MDO contractor BCM/tonne rates |
| `production_schedule` | 20 | 23-year production arrays (ore, waste, GCV…) |
| `fleet_replacement_schedule` | 12 | HEMM initial purchase & replacement schedules |
| `capex_breakups_schedule` | 6 | CHP, railway, civil infrastructure costs |
| `pre_operative_schedule` | 8 | Pre-production project cost schedule |

---

### Role-Based Access System

A **two-role access model** was implemented:

#### Role 1 — Client (Read-Only Dashboard)
- Default landing page at `/`
- Views all 8 scenario results through interactive charts
- Can switch between scenarios using the toggle controls
- **Cannot modify any inputs or trigger recalculation**

#### Role 2 — Admin (Full Access)
- Protected route at `/admin`
- Guarded by a **password gate** (`PasswordGate.tsx`) requiring the admin password
- Can view and edit all hard input parameters
- Can view and edit production schedule year-by-year data
- Can add or remove years from the schedule
- Can trigger the **"Recalculate Model"** button to rerun the Python engine

```
Admin Password Gate Flow:
─────────────────────────
  User navigates to /admin
          ↓
  PasswordGate renders
          ↓
  User enters password
          ↓
  Password correct?
    YES → AdminPage renders
    NO  → Error shown, retry
```

---

### Admin Panel Features

The `AdminPage.tsx` (1,400+ lines) was built with the following tabbed sections:

| Tab | Description |
|---|---|
| **Hard Inputs** | Editable table for all 13 input collections |
| **Production Schedule** | Year-by-year grid with inline cell editing |
| **Fleet Schedule** | HEMM phasing and replacement schedule viewer |
| **CAPEX Breakups** | CHP, civil, railway cost schedule viewer |
| **Pre-Operative** | Pre-production cost schedule viewer |
| **Coal Prices** | Commercial and NCI coal price schedule |
| **Recalculate** | Trigger button to rerun Python engine |

---

## Week 5 — Python Calculation Engine: Root-to-Result Flow

### Objectives of Week 5

Week 5 was the most technically intensive week — deep-diving into every formula of the Excel TEM and translating them faithfully into the Python calculation engine (`calculate_tem.py`, ~1,558 lines).

---

### Understanding the Root → Result Flow

The Excel workbook uses an interconnected chain of sheet-level calculations. The key chain is:

```
Production Schedule
      ↓
Fleet Sizing (Equipment Count per Year)
      ↓
HEMM Initial CAPEX + Sustaining CAPEX (Replacement Schedule)
      ↓
Owner OPEX (Diesel, Spares, Wages, Explosives, Power, Maintenance)
      ↓
MDO OPEX (Contractor BCM Rates, if MDO mode)
      ↓
Government Levies (Revenue Sharing, Royalty, DMF, NMET, GST)
      ↓
Pre-Tax Cash Flow (Revenue − CAPEX − OPEX − Govt Fees)
      ↓
P&L, Tax, Borrowings, Cash Flow → NPV / IRR
```

---

### CAPEX Calculation Module

**HEMM Fleet Sizing Logic:**

The number of equipment units required each year was computed from **production volumes** using machine productivity coefficients extracted from the Excel:

```python
# Example: Drill (115mm) fleet size per year
f_drill = (blasted_coal_BCM * 1e6) / 2_822_400  # productivity per unit per year
fleet_size = math.ceil(f_drill)                  # round up to whole units
phasing = max(0, fleet_size - fleet_size_last_year)  # only new additions
```

Four equipment types were modelled:
- **Drill (115mm)** — for blast drilling
- **Shovel (4.6 m³)** — for loading blasted material
- **Surface Miner (2200SM)** — for direct coal cutting (years 3–19)
- **Front-End Loader (6.4 m³)** — for coal loading from surface miner

**CAPEX Categories per Scenario:**

| Category | Description |
|---|---|
| `owner_initial` | Owner's initial HEMM + civil + CHP + pre-operative + land |
| `owner_sustaining` | Owner's annual sustaining CAPEX (CHP 3%, civil 4%, HEMM replacements) |
| `mdo_initial` | MDO contractor's initial HEMM fleet (only in MDO mode) |
| `mdo_sustaining` | MDO sustaining CAPEX (HEMM replacements in MDO mode) |
| `project_total` | Combined owner + MDO CAPEX (+ 15% contingency) |

---

### OPEX Calculation Module

The OPEX module computed **19 sub-categories** of operating costs per year:

| OPEX Line Item | Calculation Basis |
|---|---|
| **Diesel** | Fleet × fuel consumption rate × working hours × diesel price/litre |
| **Lubrication** | 5% of diesel cost (equipment-dependent) |
| **Spares & Consumables** | % of equipment capital cost per year (10–17%) |
| **Tyres** | FEL units × 4 tyres × Rs 1.5L per tyre |
| **Explosives** | Blasted volume × powder factor × explosive cost/kg |
| **Wages** | Manpower count × grade-wise Annual CTC |
| **Power** | CHP power load × 7.4 INR/KVAh × 7,920 hrs/yr |
| **CHP Maintenance** | 3% of CHP capital cost |
| **Civil Infrastructure Maintenance** | 2.5% of civil capital cost |
| **Administration** | 15 INR/tonne × coal production |
| **Environment & OHS** | Fixed annual cost (Rs 75 Cr + Rs 7.5 Cr) |
| **Digital Systems** | AMC on digitisation setup (3.5% of capital cost) |
| **R&R Costs** | From Rehabilitation & Resettlement schedule |
| **Rehandling** | Waste rehandling BCM × rehandling rate |
| **MDO Contractor** | BCM rates × volumes (only in MDO mode) |
| **Fire & Safety** | Slope monitoring equipment + AMC |
| **Misc** | Contingency (15% of total OPEX subtotal) |

---

### Government & Tax Module

```python
# Revenue Sharing
revenue_sharing = coal_price x coal_volume x bid_premium_pct  # 21%

# Upfront Offset (deducted from revenue sharing)
adjusted_upfront = upfront_amount / LOM_years  # amortised per year

# Royalty
royalty = nci_coal_price x coal_volume x 14%

# DMF
dmf = royalty x 10%

# NMET
nmet = royalty x 3%

# GST on Revenue Sharing
gst_revenue_sharing = revenue_sharing x 18%

# GST on Royalty / DMF / NMET
gst_royalty_etc = (royalty + dmf + nmet) x 18%

# Mine Closure Provisioning
mine_closure = coal_production x per_tonne_provision
```

---

### Engine Execution Flow

```
calculate_tem.py is executed
          ↓
Connect to MongoDB Atlas
          ↓
Load all schedule arrays & hard inputs into Python dicts
          ↓
For each of 8 scenario combinations:
    │
    ├── Determine mining_mode, pre_tax, coal_price_type
    ├── Run Fleet Sizing Module
    ├── Run CAPEX Module
    ├── Run OPEX Module
    ├── Run Government Module
    ├── Run P&L Module (if post-tax scenario)
    ├── Run Tax Module
    ├── Run Borrowings Module
    ├── Run Cash Flow Module → compute NPV, IRR
    └── Upsert result document into computed_results
          ↓
Print completion summary → server.js receives stdout
```

---

## Week 6 — Interactive Dashboard, UI/UX & Scenario Engine

### Objectives of Week 6

With the backend fully functional, Week 6 focused on making the frontend **truly interactive** — connecting the React UI to live MongoDB data, implementing scenario switching, and building all visualisation components.

---

### Custom React Hook — useScenarioData

A central data-fetching hook was built to manage all API calls and state:

```typescript
// Fetches scenario data from API based on current switch state
const { switches, setSwitches, loading, error, kpis, ... } = useScenarioData();
```

The hook:
- Builds the `scenarioKey` string from the three switch values (e.g., `"Departmental_Yes_Commercial"`)
- Fetches `GET /api/scenarios/:key` when any switch changes
- Also fetches `GET /api/capex-breakdown` for the CAPEX pie chart data
- Computes derived KPI values (LOM totals, averages, IRR formatting)
- Manages loading and error states with user-friendly UI feedback

---

### Scenario Controls — Real-Time Switching

```
┌─────────────────────────────────────────────────────────────────────┐
│  SCENARIO CONTROLS                                                   │
│                                                                     │
│  Mining Mode:     [ Departmental ]  [ MDO Contractor ]              │
│  Pre-Tax:         [ Yes ]           [ No ]                          │
│  Coal Price:      [ Commercial ]    [ NCI ]                         │
│  Machinery:       [ Shovel-Dumper ] [ Surface Miner ]               │
└─────────────────────────────────────────────────────────────────────┘
```

Switching any toggle **instantly refreshes** all charts and KPI cards — no page reload, no recalculation needed (data is pre-computed in MongoDB).

---

### KPI Summary Cards

The dashboard header shows 6 key performance metrics:

| KPI Card | Description |
|---|---|
| **Total Project CAPEX (LOM)** | Sum of all initial + sustaining capital, Rs Crore |
| **Average OPEX** | Weighted average operating cost per year, Rs Crore |
| **Project IRR** | Internal Rate of Return (pre-tax or post-tax depending on switch) |
| **Project NPV** | Net Present Value at chosen discount rate |
| **Peak Production** | Maximum annual coal production (Mtpa) |
| **Life of Mine** | Total project years (19 production + 4 pre-production) |

---

### Chart Components

| Chart | Type | Library | Data Source |
|---|---|---|---|
| **CAPEX Breakdown** | Donut/Pie | Recharts | computed_results.capex + capex_breakups |
| **OPEX Breakdown** | Horizontal Bar | Recharts | computed_results.opex |
| **Government Levies** | Donut | Recharts | computed_results.government |
| **Yearly Cost Profile** | Stacked Area | Recharts | yearlyChartData derived from scenario |
| **Production Schedule** | Data Grid | Custom Table | production_schedule collection |
| **Breakdown Table** | Data Grid | Custom Table | computed_results yearly schedules |

---

### Responsive Layout

The dashboard used a **CSS Grid + Flexbox** layout system:

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (SRK Logo + Navigation)                              │
├──────────────────────────────────────────────────────────────┤
│  SCENARIO CONTROLS ROW                                       │
├─────────────┬─────────────┬─────────────┬────────────────────┤
│  KPI Card   │  KPI Card   │  KPI Card   │  KPI Card          │
├─────────────┴─────────────┴─────────────┴────────────────────┤
│  CAPEX Pie Chart   │  OPEX Bar Chart   │  Govt Donut Chart   │
├────────────────────┴───────────────────┴─────────────────────┤
│  Yearly Area Chart (Full Width)                              │
├──────────────────────────────────────────────────────────────┤
│  Production Schedule Table (Horizontal Scroll)               │
└──────────────────────────────────────────────────────────────┘
```

---

## Week 7 — Validation, Testing & Mathematical Integrity

### Objectives of Week 7

Week 7 was dedicated entirely to **cross-verification of the Python calculation engine's outputs against the original Excel workbook**, ensuring mathematical fidelity before presenting to domain experts.

---

### Validation Methodology

**Cell-by-cell comparison** was performed using a series of verification scripts:

```
verify_excel_direct.py         → Reads Excel cells directly using openpyxl
verify_results.py              → Reads MongoDB computed_results
verify_4_equip_calculations.py → Compares fleet sizing, CAPEX, OPEX line by line
print_dashboard_detailed.py    → Formatted output of all yearly values
```

For each calculated line item, the comparison checked:
- **Absolute difference** (Rs Crore)
- **Percentage error** (< 0.01% threshold for acceptance)
- **Year-by-year matching** for all 23 years (Years -4 through 19)

---

### Modules Validated

| Module | Validation Status | Notes |
|---|---|---|
| Fleet sizing (Drill, Shovel, SM, FEL) | Matches | Ceiling function logic verified |
| HEMM Initial CAPEX | Matches | Phasing × unit cost confirmed |
| HEMM Replacement (Sustaining) | Matches | Life-cycle replacement years verified |
| Diesel OPEX | Matches | Fuel × hours × fleet × price |
| Wages | Matches | Grade-wise CTC × headcount |
| Explosives | Matches | Powder factor × BCM × cost |
| Revenue Sharing | Matches | Bid premium (21%) on correct price type |
| Royalty | Matches | 14% on NCI price |
| DMF, NMET | Matches | % of royalty |
| GST Computation | Matches | Applied correctly on each component |
| Pre-Tax Cash Flow | Matches | Revenue − CAPEX − OPEX − Govt |
| NPV / IRR | Matches | numpy-npv / IRR bisection method |

---

### Issues Found & Resolved

During validation, several discrepancies were identified and fixed:

1. **Surface Miner fleet logic**: SM units were incorrectly being sized even in years 1–2 when the model uses only blasting. Fixed with a `yr <= sm_threshold_year` condition.

2. **FEL lubrication factor**: The lubrication cost multiplier for FEL was set at `0.05` (same as other equipment) but Excel used `0.20` for FEL tyres. Corrected in engine specs dictionary.

3. **MDO CAPEX contingency**: Contingency was being applied to MDO costs in Departmental mode — fixed with an `if mdo_mode` guard.

4. **Upfront amount amortisation**: The upfront payment offset was being divided over all 23 years instead of only the 19 production years. Fixed to divide only over production year span.

5. **Year labelling**: Pre-production years (-4, -3, -2, -1) were being excluded from some LOM total summations. Fixed by ensuring full `YEAR_HEADERS` iteration.

---

### Cross-Verification Result

After all corrections, the Python engine produced outputs within **±0.01%** of the Excel workbook for all calculated values, confirming **full mathematical integrity** of the web application.

---

## Week 8 — Final Changes, Upgrades & Presentation Preparation

### Objectives of Week 8

Week 8 focused on polishing the full application — addressing feedback from internal review, upgrading UI components, and preparing this presentation and a formal technical report.

---

### UI / UX Upgrades Implemented

| Upgrade | Description |
|---|---|
| **Error State Handling** | Friendly error UI if API server is unreachable — with clear setup instructions |
| **Loading Spinner** | Premium animated spinner while data loads from MongoDB |
| **Retry Button** | "Retry Connection" button in error state |
| **IRR Formatting** | IRR values formatted as percentage strings with edge-case handling |
| **Admin Input Feedback** | Success/error toast feedback after updating a hard input |
| **Recalculate Status** | Live stdout streaming shown in admin panel after triggering recalculation |
| **Year Add/Remove** | Admin can extend or shorten the mine life by adding/removing years |
| **Production Schedule Inline Edit** | Admin can edit any year-by-year production value in the grid |
| **Responsive Tables** | Horizontal scroll with sticky first column for all schedule tables |
| **Colour-coded Values** | Negative values shown in rose, positive in emerald across all tables |

---

### Additional API Endpoints Added

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/update-input` | POST | Update a single hard input parameter |
| `/api/admin/update-production-schedule` | POST | Update a year-by-year schedule item |
| `/api/admin/add-year` | POST | Add next year to all schedule collections |
| `/api/admin/remove-year` | POST | Remove latest year from all schedule collections |
| `/api/capex-breakdown` | GET | LOM aggregate CAPEX component totals for pie charts |

---

### Deployment Configuration

A `Dockerfile` and `DEPLOYMENT.md` were prepared for containerised deployment:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/ ./server/
RUN cd server && npm install
EXPOSE 4000
CMD ["node", "server/server.js"]
```

The frontend was configured for **Vercel deployment** with environment variable `VITE_API_BASE` pointing to the deployed backend (Render.com), enabling a fully cloud-hosted version of the application.

---

### Technical Report & Documentation

The following documentation was produced:

| Document | Description |
|---|---|
| `ReadMe.md` | Full technical workflow (Phase 0–10) for developer handover |
| `DEPLOYMENT.md` | Step-by-step deployment guide for cloud hosting |
| `Technical Workflow.docx` | Formal project report for SRK internal records |
| `TEM_Formula_Reference.txt` | Line-by-line formula reference for the Python engine |
| `Equipment_Fleet_Formula_Reference.txt` | HEMM fleet sizing formula documentation |
| `Production_Schedule_Formula_Reference.txt` | Production schedule calculation reference |
| `PreTax_PreFinance_Formula_Reference.txt` | Pre-tax cash flow formula documentation |
| `Presentation.md` | This internship presentation document |

---

## Week 9 — Further Improvements, Feedback & Project Handover

### Objectives of Week 9

The final week focused on **structured discussions** about the system's current limitations, a **feedback session** with domain experts, and formally **handing over the project** to a full-time SRK employee for continued development.

---

### Key Discussion Points — Further Improvements

Based on review sessions with the SRK team, the following improvements and future development items were identified:

#### High Priority (Near-Term)

| Item | Description |
|---|---|
| **Post-Tax Full Model** | Complete post-tax cash flow — P&L, depreciation, working capital, loan drawdown, equity IRR |
| **Sensitivity Analysis** | One-at-a-time sensitivity for diesel price, coal price, production volume |
| **What-If Scenarios** | User-defined parameter ranges to generate sensitivity tornado charts |
| **PDF / Excel Export** | Export the full scenario output as a formatted PDF report or Excel workbook |
| **User Authentication (JWT)** | Replace the password gate with a proper JWT-based login system with user roles stored in database |
| **Audit Trail** | Log all parameter changes with timestamp and user identity |

#### Medium Priority (Medium-Term)

| Item | Description |
|---|---|
| **Live Diesel Price API** | Integrate an external API to auto-update diesel price from market benchmarks |
| **Coal Price Schedule Editor** | Allow admin to edit year-by-year commercial and NCI coal prices directly |
| **Multi-Project Support** | Allow multiple mine projects to be managed from the same platform |
| **Version Control for Scenarios** | Save named scenario snapshots and compare them side-by-side |
| **Scenario Versioning Engine** | Track changes to inputs with rollback capability |

#### Long-Term (Future Vision)

| Item | Description |
|---|---|
| **Kubernetes Deployment** | Containerised, auto-scaling cloud deployment on AWS ECS/EKS |
| **Real-Time Calculation Queue** | Background job queue (Redis + worker) for heavy recalculations |
| **Power BI / Plotly Integration** | Advanced analytics dashboards with drill-down capabilities |
| **Mobile-Responsive Admin** | Field-accessible admin interface optimised for tablets |

---

### Bottlenecks Identified

| Bottleneck | Impact | Proposed Solution |
|---|---|---|
| Python engine runs synchronously | Blocks API server during ~20–30 second recalculation | Move to async task queue (Celery + Redis) |
| Single MongoDB instance | All 8 scenarios recomputed on every recalculate | Pre-filter which scenarios need recomputation based on changed input |
| Password-based admin auth | Not scalable for multiple team members | Implement JWT + role-based user table in MongoDB |
| Static hard input JSON seeds | Re-seeding required when adding new parameters | Build a parameter metadata schema for dynamic form generation |
| No change history | Auditors cannot track who changed what | Implement MongoDB history array on each parameter document |

---

### Feedback from SRK Domain Experts

Key feedback received from the SRK engineering and finance team:

> *"The dashboard is a significant improvement in how we can communicate TEM outputs to clients — the visual charts make it far easier to explain CAPEX vs. OPEX vs. government levy breakdowns."*

> *"The ability to instantly compare Departmental vs. MDO scenarios side by side is exactly what we need for client presentations."*

> *"The mathematical validation gives us confidence that the web tool matches our Excel model. The next step is to extend this to the full post-tax financial model."*

> *"Adding sensitivity analysis will make this a complete feasibility study tool that can replace the need to distribute Excel files to clients."*

---

### Project Handover Summary

The following deliverables were formally handed over to the continuing SRK engineer:

| Deliverable | Status |
|---|---|
| Full source code repository (Git) | Transferred |
| MongoDB Atlas database access | Credentials documented |
| `ReadMe.md` — developer guide | Complete |
| `DEPLOYMENT.md` — cloud deployment guide | Complete |
| Formula reference documents (4 files) | Complete |
| Hard Input JSON seed files (13 files) | Complete |
| Python calculation engine (`calculate_tem.py`) | Fully documented |
| Verification scripts (5 scripts) | Ready for use |
| Technical Workflow report | Submitted |
| This Presentation (`Presentation.md`) | Complete |

---

## Key Takeaways & Learnings

### Technical Skills Gained

| Domain | Skills Developed |
|---|---|
| **Mining Engineering** | TEM structure, CAPEX/OPEX modelling, LOM cash flow, NPV/IRR computation |
| **Python** | Excel parsing (openpyxl), MongoDB integration (PyMongo), NumPy financial functions |
| **Node.js / Express** | REST API design, MongoDB Node.js driver, child process execution |
| **React / TypeScript** | Component architecture, custom hooks, Recharts visualisation, TypeScript interfaces |
| **MongoDB** | Document schema design, upsert operations, aggregation queries |
| **Full-Stack Integration** | Connecting frontend to API to Python engine to database in a coherent architecture |
| **Software Engineering** | ETL pipelines, role-based access control, data validation, documentation |

---

### Architecture Decisions & Rationale

| Decision | Rationale |
|---|---|
| **Pre-compute all 8 scenarios** | Dashboard scenario switching is instant — no recalculation lag for end users |
| **Python for formula engine** | Transparent, auditable formula code close to Excel logic; NumPy for IRR/NPV |
| **Node.js as API gateway** | Lightweight HTTP layer, does not need to understand domain formulas |
| **MongoDB (document store)** | Flexible schema for year-by-year arrays; easier than relational for time-series |
| **React + Vite + TypeScript** | Modern SPA with type safety; Recharts provides production-ready financial charts |
| **CSS Variables design system** | Consistent theming, dark mode, easy future rebranding |

---

### Summary of Work Completed

Over 9 weeks, the following was delivered:

- **Complete reverse engineering** of a 23-year, multi-sheet, multi-scenario Excel TEM workbook
- **MongoDB database** with 22+ collections, fully populated from the Excel source
- **Python calculation engine** (1,558 lines) computing all 8 scenario combinations with validated mathematical fidelity
- **Node.js REST API** (427 lines) with 12 endpoints supporting all client and admin operations
- **React frontend** (2,000+ lines across 11 components + 2 pages) with interactive charts, scenario toggles, and admin panel
- **Role-based access** — client dashboard view vs. password-protected admin panel
- **Mathematical validation** — cell-by-cell cross-verification of Python outputs vs. Excel workbook
- **Deployment configuration** — Dockerfile + Vercel config for cloud hosting
- **Complete documentation** — README, deployment guide, formula references, technical report

---

> **"The goal was to take a static, expert-only Excel model and transform it into a live, secure, role-based web application that any authorised stakeholder — client, engineer, or manager — could use to explore the economics of a coal mining project in real time."**
>
> — Rishi Das, Intern, SRK Consulting India, 2026

---

*Document prepared by: Rishi Das*
*Internship Period: June – August 2026*
*Organisation: SRK Consulting (India) Pvt. Ltd.*
*Project: IN1411 — Radhikapur Coal Block TEM Digitisation*

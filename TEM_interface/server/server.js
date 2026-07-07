require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { exec } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DATABASE_NAME || "tem";
const PORT = process.env.PORT || 4000;

let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`Connected to MongoDB database: ${DB_NAME}`);
}

// ── Scenario endpoints ──────────────────────────────────────────────

// GET /api/scenarios — list all scenario keys
app.get("/api/scenarios", async (_req, res) => {
  try {
    const docs = await db
      .collection("computed_results")
      .find({}, { projection: { scenarioKey: 1, switches: 1, _id: 0 } })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scenarios/:key — full computed results for one scenario
app.get("/api/scenarios/:key", async (req, res) => {
  try {
    const doc = await db
      .collection("computed_results")
      .findOne({ scenarioKey: req.params.key }, { projection: { _id: 0 } });
    if (!doc) return res.status(404).json({ error: "Scenario not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Schedules / raw breakdowns ──────────────────────────────────────

// GET /api/schedules/capex-breakups — individual CAPEX component schedules
app.get("/api/schedules/capex-breakups", async (_req, res) => {
  try {
    const docs = await db
      .collection("capex_breakups_schedule")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/schedules/production — production schedule
app.get("/api/schedules/production", async (_req, res) => {
  try {
    const docs = await db
      .collection("production_schedule")
      .find({}, { projection: { _id: 0 } })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/schedules/:collection — generic schedule reader
app.get("/api/schedules/:collection", async (req, res) => {
  const allowed = [
    "production_schedule",
    "pre_operative_schedule",
    "land_schedule",
    "rr_schedule",
    "coal_price_schedule",
    "capex_breakups_schedule",
    "fleet_replacement_schedule",
    "wages_schedule",
    "government_schedule",
    "owner_opex_schedule",
    "project_opex_schedule",
  ];
  const col = req.params.collection;
  if (!allowed.includes(col)) {
    return res.status(400).json({ error: `Collection '${col}' is not allowed` });
  }
  try {
    const docs = await db
      .collection(col)
      .find({}, { projection: { _id: 0 } })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Hard inputs (admin) ─────────────────────────────────────────────

const HARD_INPUT_COLLECTIONS = [
  "salary_wages",
  "working_regime",
  "basic_consideration",
  "density_swell_factor",
  "explosives",
  "unit_rates_opcosts",
  "maintainance_cost",
  "operational_para",
  "govt_fees_charges",
  "payment_assumption",
  "mdo_assumption",
  "safety_slope_stability",
  "production_schedule_params",
];

// GET /api/hard-inputs — all hard input collections
app.get("/api/hard-inputs", async (_req, res) => {
  try {
    const result = {};
    for (const col of HARD_INPUT_COLLECTIONS) {
      result[col] = await db
        .collection(col)
        .find({}, { projection: { _id: 0 } })
        .toArray();
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hard-inputs/:collection
app.get("/api/hard-inputs/:collection", async (req, res) => {
  const col = req.params.collection;
  if (!HARD_INPUT_COLLECTIONS.includes(col)) {
    return res.status(400).json({ error: `Collection '${col}' not available` });
  }
  try {
    const docs = await db
      .collection(col)
      .find({}, { projection: { _id: 0 } })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Component-level CAPEX breakdown (for pie chart) ─────────────────

// Returns LOM totals for each CAPEX component from the raw schedules
app.get("/api/capex-breakdown", async (_req, res) => {
  try {
    // Pre-operative
    const preOp = await db
      .collection("pre_operative_schedule")
      .findOne({ item: "Total" });
    const preOpTotal = preOp
      ? Object.values(preOp.yearly_values).reduce((s, v) => s + (parseFloat(v) || 0), 0)
      : 0;

    // Land
    const land = await db
      .collection("land_schedule")
      .findOne({ item: /Land/ });
    const landTotal = land
      ? Object.values(land.yearly_values).reduce((s, v) => s + (parseFloat(v) || 0), 0)
      : 0;

    // R&R
    const rr = await db.collection("rr_schedule").findOne({ item: /R.R/ });
    const rrTotal = rr
      ? Object.values(rr.yearly_values).reduce((s, v) => s + (parseFloat(v) || 0), 0)
      : 0;

    // HEMM (fleet initial)
    const fleet = await db
      .collection("fleet_replacement_schedule")
      .findOne({ item: /Total Initial/ });
    const fleetTotal = fleet
      ? Object.values(fleet.yearly_values).reduce((s, v) => s + (parseFloat(v) || 0), 0)
      : 0;

    // HEMM Replacement (sustaining)
    const fleetRepl = await db
      .collection("fleet_replacement_schedule")
      .findOne({ item: /Replacement/ });
    const fleetReplTotal = fleetRepl
      ? Object.values(fleetRepl.yearly_values).reduce((s, v) => s + (parseFloat(v) || 0), 0)
      : 0;

    // Capex breakups (CHP, Railway Siding, Civil, etc.)
    const breakups = await db
      .collection("capex_breakups_schedule")
      .find({})
      .toArray();
    const breakupTotals = {};
    for (const b of breakups) {
      breakupTotals[b.item] = Object.values(b.yearly_values).reduce(
        (s, v) => s + (parseFloat(v) || 0),
        0
      );
    }

    res.json({
      pre_operative: preOpTotal,
      land: landTotal,
      rr: rrTotal,
      hemm_initial: fleetTotal,
      hemm_replacement: fleetReplTotal,
      breakups: breakupTotals,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin update and recalculation endpoints ─────────────────────────

const VALUE_FIELDS = {
  salary_wages: "Annual CTC",
  working_regime: "Values",
  basic_consideration: "Value",
  density_swell_factor: "Value",
  explosives: "Value",
  unit_rates_opcosts: "Base Rate",
  maintainance_cost: "Base Rate",
  operational_para: "Values",
  govt_fees_charges: "Base Rate",
  payment_assumption: "Base Rate",
  mdo_assumption: "Value",
  safety_slope_stability: "Value",
  production_schedule_params: "Value"
};

// POST /api/admin/update-input — update a single parameter's value
app.post("/api/admin/update-input", async (req, res) => {
  const { collection, key, value } = req.body;
  if (!collection || !key || value === undefined) {
    return res.status(400).json({ error: "Missing collection, key, or value" });
  }

  const valField = VALUE_FIELDS[collection];
  if (!valField) {
    return res.status(400).json({ error: `Invalid collection: ${collection}` });
  }

  try {
    const result = await db.collection(collection).updateOne(
      { key: key },
      { $set: { [valField]: value } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Parameter not found" });
    }
    res.json({ success: true, message: "Parameter updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/update-production-schedule — update year-by-year schedule item
app.post("/api/admin/update-production-schedule", async (req, res) => {
  const { item, yearly_values } = req.body;
  if (!item || !yearly_values) {
    return res.status(400).json({ error: "Missing item or yearly_values" });
  }

  try {
    const cleanedValues = {};
    for (const [yr, val] of Object.entries(yearly_values)) {
      const parsed = parseFloat(val);
      cleanedValues[yr] = isNaN(parsed) ? val : parsed;
    }

    const result = await db.collection("production_schedule").updateOne(
      { item: item },
      { $set: { yearly_values: cleanedValues } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: `Item '${item}' not found in production_schedule` });
    }

    res.json({ success: true, message: `Production schedule item '${item}' updated successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/add-year — add next year to all yearly value collections
app.post("/api/admin/add-year", async (req, res) => {
  try {
    const sampleDoc = await db.collection("production_schedule").findOne();
    if (!sampleDoc || !sampleDoc.yearly_values) {
      return res.status(500).json({ error: "No production schedule found to determine years" });
    }

    const years = Object.keys(sampleDoc.yearly_values)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (years.length === 0) {
      return res.status(500).json({ error: "Could not find any years in production schedule" });
    }

    const maxYear = Math.max(...years);
    const nextYear = maxYear + 1;
    const nextYearStr = String(nextYear);

    const collectionsToUpdate = [
      "production_schedule",
      "pre_operative_schedule",
      "land_schedule",
      "rr_schedule",
      "coal_price_schedule",
      "capex_breakups_schedule",
      "fleet_replacement_schedule",
      "wages_schedule",
      "government_schedule",
      "owner_opex_schedule",
      "project_opex_schedule"
    ];

    for (const colName of collectionsToUpdate) {
      const col = db.collection(colName);
      await col.updateMany(
        {},
        { $set: { [`yearly_values.${nextYearStr}`]: 0 } }
      );
    }

    res.json({ success: true, addedYear: nextYearStr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/remove-year — remove latest year from all yearly value collections
app.post("/api/admin/remove-year", async (req, res) => {
  try {
    const sampleDoc = await db.collection("production_schedule").findOne();
    if (!sampleDoc || !sampleDoc.yearly_values) {
      return res.status(500).json({ error: "No production schedule found to determine years" });
    }

    const years = Object.keys(sampleDoc.yearly_values)
      .map(Number)
      .filter((n) => !isNaN(n));

    if (years.length === 0) {
      return res.status(500).json({ error: "Could not find any years in production schedule" });
    }

    const maxYear = Math.max(...years);
    // Don't allow removing years <= 1 to protect core structure
    if (maxYear <= 1) {
      return res.status(400).json({ error: "Cannot remove core production years (<= 1)" });
    }

    const maxYearStr = String(maxYear);

    const collectionsToUpdate = [
      "production_schedule",
      "pre_operative_schedule",
      "land_schedule",
      "rr_schedule",
      "coal_price_schedule",
      "capex_breakups_schedule",
      "fleet_replacement_schedule",
      "wages_schedule",
      "government_schedule",
      "owner_opex_schedule",
      "project_opex_schedule"
    ];

    for (const colName of collectionsToUpdate) {
      const col = db.collection(colName);
      await col.updateMany(
        {},
        { $unset: { [`yearly_values.${maxYearStr}`]: "" } }
      );
    }

    res.json({ success: true, removedYear: maxYearStr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/project-metadata — get saved project metadata
app.get("/api/project-metadata", async (_req, res) => {
  try {
    const meta = await db.collection("project_metadata").findOne({}, { projection: { _id: 0 } });
    res.json(meta || { projectId: "", projectManager: "", clientCompany: "", projectDescription: "" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/upload-excel — upload Excel and trigger worker
const fs = require("fs");
app.post("/api/admin/upload-excel", async (req, res) => {
  const { fileContent, fileName, projectId, projectManager, clientCompany, projectDescription } = req.body;
  
  if (!fileContent) {
    return res.status(400).json({ error: "Missing uploaded file content" });
  }
  
  try {
    // 1. Decode base64 to buffer
    const buffer = Buffer.from(fileContent, "base64");
    
    // 2. Write to a temp file in the server directory
    const tempPath = path.join(__dirname, "temp_upload.xlsx");
    fs.writeFileSync(tempPath, buffer);
    
    // 3. Prepare env variables for worker.py
    const env = {
      ...process.env,
      PROJECT_ID: projectId || "",
      PROJECT_MANAGER: projectManager || "",
      CLIENT_COMPANY: clientCompany || "",
      PROJECT_DESCRIPTION: projectDescription || "",
    };
    
    const workerPath = path.join(__dirname, "../worker.py");
    console.log(`Running worker script on uploaded file: ${tempPath}`);
    
    // 4. Run worker.py
    exec(`python3 "${workerPath}" "${tempPath}"`, { env }, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch (err) {
        console.error("Failed to delete temp upload file:", err.message);
      }
      
      if (error) {
        console.error(`Worker error: ${error.message}`);
        return res.status(500).json({ error: error.message, stderr, stdout });
      }
      
      console.log("Worker completed successfully.");
      res.json({ success: true, log: stdout });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recalculate — trigger calculate_tem.py recalculation

app.post("/api/recalculate", async (req, res) => {
  const scriptPath = path.join(__dirname, "../calculate_tem.py");
  console.log(`Running calculation engine script: ${scriptPath}`);
  
  exec(`python3 "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Recalculation error: ${error.message}`);
      return res.status(500).json({ error: error.message, stderr });
    }
    console.log("Recalculation completed successfully.");
    res.json({ success: true, stdout });
  });
});

// ── Start server ────────────────────────────────────────────────────

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`TEM API server running on http://localhost:${PORT}`);
  });
});

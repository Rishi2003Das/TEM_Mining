import sys
import os
import json
import openpyxl
import pymongo

# Configuration
CONNECTION_STRING = os.environ.get("MONGODB_URI", "mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "tem")

# Hard input sheets mapping
HARD_INPUT_MAPPING = {
    "basic_consideration": {"start_row": 4, "end_row": 13, "json_file": "basic_consideration.json", "val_field": "Value"},
    "working_regime": {"start_row": 16, "end_row": 29, "json_file": "working_regime.json", "val_field": "Values"},
    "density_swell_factor": {"start_row": 32, "end_row": 35, "json_file": "density_swell_factor.json", "val_field": "Value"},
    "salary_wages": {"start_row": 38, "end_row": 76, "json_file": "salary_wages.json", "val_field": "Annual CTC"},
    "explosives": {"start_row": 80, "end_row": 88, "json_file": "explosives.json", "val_field": "Value"},
    "unit_rates_opcosts": {"start_row": 96, "end_row": 106, "json_file": "unit_rates_opcosts.json", "val_field": "Base Rate"},
    "maintainance_cost": {"start_row": 108, "end_row": 111, "json_file": "maintainance_cost.json", "val_field": "Base Rate"},
    "operational_para": {"start_row": 113, "end_row": 118, "json_file": "operational_para.json", "val_field": "Values"},
    "govt_fees_charges": {"start_row": 120, "end_row": 135, "json_file": "govt_fees_charges.json", "val_field": "Base Rate"},
    "payment_assumption": {"start_row": 137, "end_row": 144, "json_file": "payment_assumption.json", "val_field": "Base Rate"},
    "mdo_assumption": {"start_row": 147, "end_row": 153, "json_file": "mdo_assumption.json", "val_field": "Value"},
    "safety_slope_stability": {"start_row": 156, "end_row": 158, "json_file": "safety_slope_stability.json", "val_field": "Value"}
}

YEAR_HEADERS = [-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

def parse_schedule_row(sheet, row_idx, description_col=2, unit_col=3, total_col=4, col_start=5, col_end=27):
    description = sheet.cell(row_idx, description_col).value
    if not description:
        return None
    
    unit = sheet.cell(row_idx, unit_col).value
    total_val = sheet.cell(row_idx, total_col).value
    
    yearly_values = {}
    for col_idx in range(col_start, col_end + 1):
        year_name = str(YEAR_HEADERS[col_idx - col_start])
        val = sheet.cell(row_idx, col_idx).value
        if val is None or val == "":
            yearly_values[year_name] = 0.0
        elif isinstance(val, (int, float)):
            yearly_values[year_name] = float(val)
        else:
            try:
                yearly_values[year_name] = float(val)
            except ValueError:
                yearly_values[year_name] = val
                
    return {
        "item": str(description).strip(),
        "unit": str(unit).strip() if unit else "",
        "lom_total_or_average": float(total_val) if isinstance(total_val, (int, float)) else total_val,
        "yearly_values": yearly_values
    }

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 worker.py <path_to_excel_file>")
        sys.exit(1)
        
    excel_path = sys.argv[1]
    if not os.path.exists(excel_path):
        print(f"Error: Excel file not found at {excel_path}")
        sys.exit(1)
        
    print(f"Connecting to MongoDB...")
    client = pymongo.MongoClient(CONNECTION_STRING)
    db = client[DATABASE_NAME]
    
    # Verify connection
    client.admin.command('ping')
    print("MongoDB connected successfully.")
    
    # Update project metadata from environment variables if present
    project_id = os.environ.get("PROJECT_ID")
    project_manager = os.environ.get("PROJECT_MANAGER")
    client_company = os.environ.get("CLIENT_COMPANY")
    project_description = os.environ.get("PROJECT_DESCRIPTION")
    
    if project_id:
        print(f"Saving project metadata for ID: {project_id}...")
        db["project_metadata"].delete_many({})
        db["project_metadata"].insert_one({
            "projectId": project_id,
            "projectManager": project_manager or "",
            "clientCompany": client_company or "",
            "projectDescription": project_description or ""
        })
        print("Project metadata successfully saved.")
        
    print(f"Loading Excel workbook: {excel_path}...")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    hard_input_dir = os.path.join(script_dir, "Hard_Input")
    
    # 1. Parse and extract assumptions from 'Assumptions_Dashboard'
    print("\nParsing 'Assumptions_Dashboard' for hard inputs...")
    dash_sheet = wb["Assumptions_Dashboard"]
    
    for collection_name, config in HARD_INPUT_MAPPING.items():
        json_path = os.path.join(hard_input_dir, config["json_file"])
        if not os.path.exists(json_path):
            print(f"Warning: JSON template {config['json_file']} not found. Skipping.")
            continue
            
        with open(json_path, 'r', encoding='utf-8') as f:
            template_items = json.load(f)
            
        updated_items = []
        for i, item in enumerate(template_items):
            row_idx = config["start_row"] + i
            # Read cell value from column 4 (col D)
            val = dash_sheet.cell(row_idx, 4).value
            
            # Format date if datetime
            if isinstance(val, (int, float)):
                # If percentage, keep as float/number
                val = float(val)
            elif val is None:
                val = 0.0
            elif hasattr(val, "strftime"): # datetime
                val = val.strftime("%d-%b-%y")
            else:
                val = str(val).strip()
                # Try to cast to float if numeric string
                try:
                    val = float(val.replace(",", ""))
                except ValueError:
                    pass
            
            # Update value field
            item[config["val_field"]] = val
            updated_items.append(item)
            
        print(f"Upserting {len(updated_items)} items into collection '{collection_name}'...")
        db[collection_name].delete_many({})
        if updated_items:
            db[collection_name].insert_many(updated_items)
            
    # 2. Parse and extract 'production_schedule_params'
    print("\nParsing production schedule parameters...")
    prod_sched_sheet = wb["Production Schedule"]
    
    params_json_path = os.path.join(hard_input_dir, "production_schedule_params.json")
    if os.path.exists(params_json_path):
        with open(params_json_path, 'r', encoding='utf-8') as f:
            params_template = json.load(f)
            
        # Map parameters to specific cells
        # format: key -> (sheet, cell_coord)
        param_cell_mapping = {
            "partings_percent": (prod_sched_sheet, "A11"),
            "chp_rehandling_rate": (prod_sched_sheet, "A12"),
            "chp_rehandling_capacity": (dash_sheet, "D32"),
            "blasted_coal_fraction": (dash_sheet, "D81"),
            "sm_threshold_year": (dash_sheet, "D80"),
            "available_hours_per_year": (dash_sheet, "D29"),
            "bench_height_coal": (prod_sched_sheet, "D30"),
            "bench_width_coal": (prod_sched_sheet, "D31"),
            "bench_height_ob_ib": (prod_sched_sheet, "D32"),
            "bench_width_ob_ib": (prod_sched_sheet, "D33")
        }
        
        for item in params_template:
            key = item.get("key")
            if key in param_cell_mapping:
                sheet_obj, cell_coord = param_cell_mapping[key]
                val = sheet_obj[cell_coord].value
                item["Value"] = float(val) if isinstance(val, (int, float)) else val
                
        print(f"Upserting production_schedule_params...")
        db["production_schedule_params"].delete_many({})
        db["production_schedule_params"].insert_many(params_template)

    # 3. Parse and extract schedules (year-by-year)
    # A. Production Schedule
    print("Parsing 'Production Schedule'...")
    prod_docs = []
    prod_rows = [4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 23, 24, 25, 26, 27, 30, 31, 32, 33, 35]
    for r in prod_rows:
        doc = parse_schedule_row(prod_sched_sheet, r)
        if doc:
            prod_docs.append(doc)
            
    # B. Pre-Operative
    print("Parsing 'Pre-Operative'...")
    pre_sheet = wb["Pre-Operative"]
    pre_docs = []
    for r in range(5, 41):
        description = pre_sheet.cell(r, 2).value
        if not description:
            continue
        unit = pre_sheet.cell(r, 3).value
        total_val = pre_sheet.cell(r, 5).value
        yearly_values = {}
        pre_years = [-4, -3, -2, -1]
        for idx, yr in enumerate(pre_years):
            val = pre_sheet.cell(r, 6 + idx).value
            yearly_values[str(yr)] = float(val) if isinstance(val, (int, float)) else (0.0 if val is None else val)
        for yr in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]:
            yearly_values[str(yr)] = 0.0
            
        pre_docs.append({
            "item": str(description).strip(),
            "unit": str(unit).strip() if unit else "",
            "lom_total_or_average": float(total_val) if isinstance(total_val, (int, float)) else total_val,
            "yearly_values": yearly_values
        })
        
    # C. Land
    print("Parsing 'Land'...")
    land_sheet = wb["Land"]
    land_docs = []
    for r in [5, 6]:
        doc = parse_schedule_row(land_sheet, r, description_col=2, unit_col=2, total_col=3, col_start=4, col_end=26)
        if doc:
            if r == 6:
                doc["item"] = "Land Cost Factor"
            land_docs.append(doc)

    # D. R&R
    print("Parsing 'R&R'...")
    rr_sheet = wb["R&R"]
    rr_docs = []
    for r in [6, 7]:
        doc = parse_schedule_row(rr_sheet, r, description_col=2, unit_col=3, total_col=4, col_start=4, col_end=26)
        if doc:
            rr_docs.append(doc)

    # E. Coal Price
    print("Parsing 'Coal Price'...")
    cp_sheet = wb["Coal Price"]
    cp_docs = []
    for r in [5, 7, 8]:
        doc = parse_schedule_row(cp_sheet, r, description_col=2, unit_col=3, total_col=4)
        if doc:
            cp_docs.append(doc)

    # F. Capex Breakups
    print("Parsing 'Capex Breakups'...")
    cb_sheet = wb["Capex Breakups"]
    cb_docs = []
    for r in range(4, 12):
        doc = parse_schedule_row(cb_sheet, r, description_col=2, unit_col=3, total_col=3)
        if doc:
            cb_docs.append(doc)

    # G. Fleet
    print("Parsing 'Fleet'...")
    fleet_sheet = wb["Fleet"]
    fleet_docs = []
    for r in [366, 413]:
        description = fleet_sheet.cell(r, 3).value
        unit = fleet_sheet.cell(r, 4).value
        total_val = fleet_sheet.cell(r, 6).value
        yearly_values = {}
        for col_idx in range(7, 30):
            year_name = str(YEAR_HEADERS[col_idx - 7])
            val = fleet_sheet.cell(r, col_idx).value
            yearly_values[year_name] = float(val) if isinstance(val, (int, float)) else 0.0

        fleet_docs.append({
            "item": str(description).strip(),
            "unit": str(unit).strip() if unit else "",
            "lom_total_or_average": float(total_val) if isinstance(total_val, (int, float)) else total_val,
            "yearly_values": yearly_values
        })

    # Wage-Owner
    print("Parsing 'Wage-Owner'...")
    wage_sheet = wb["Wage-Owner"]
    total_val = wage_sheet.cell(280, 6).value
    yearly_values = {}
    for col_idx in range(10, 33):
        year_name = str(YEAR_HEADERS[col_idx - 10])
        val = wage_sheet.cell(280, col_idx).value
        yearly_values[year_name] = float(val) if isinstance(val, (int, float)) else 0.0

    wage_docs = [{
        "item": "Total Wages",
        "unit": "INR Cr",
        "lom_total_or_average": float(total_val) if isinstance(total_val, (int, float)) else total_val,
        "yearly_values": yearly_values
    }]

    # H. Government
    print("Parsing 'Government'...")
    gov_sheet = wb["Government"]
    gov_docs = []
    for r in range(4, 37):
        doc = parse_schedule_row(gov_sheet, r, description_col=2, unit_col=3, total_col=4)
        if doc:
            gov_docs.append(doc)

    # I. Owner OPEX
    print("Parsing 'Owner OPEX'...")
    owner_opex_sheet = wb["Owner OPEX"]
    owner_opex_docs = []
    for r in range(56, 93):
        doc = parse_schedule_row(owner_opex_sheet, r, description_col=2, unit_col=3, total_col=4)
        if doc:
            owner_opex_docs.append(doc)

    # J. Project OPEX
    print("Parsing 'Project OPEX'...")
    project_opex_sheet = wb["Project OPEX"]
    project_opex_docs = []
    for r in range(59, 101):
        doc = parse_schedule_row(project_opex_sheet, r, description_col=2, unit_col=3, total_col=4)
        if doc:
            project_opex_docs.append(doc)

    # Save to DB
    db_mappings = {
        "production_schedule": prod_docs,
        "pre_operative_schedule": pre_docs,
        "land_schedule": land_docs,
        "rr_schedule": rr_docs,
        "coal_price_schedule": cp_docs,
        "capex_breakups_schedule": cb_docs,
        "fleet_replacement_schedule": fleet_docs,
        "wages_schedule": wage_docs,
        "government_schedule": gov_docs,
        "owner_opex_schedule": owner_opex_docs,
        "project_opex_schedule": project_opex_docs
    }

    for col_name, docs in db_mappings.items():
        print(f"Importing {len(docs)} documents into collection '{col_name}'...")
        collection = db[col_name]
        collection.delete_many({})
        if docs:
            collection.insert_many(docs)

    print("\nExcel data successfully imported to MongoDB.")
    
    # 4. Trigger calculate_tem.py
    print("Triggering recalculation...")
    import subprocess
    calc_script = os.path.join(script_dir, "calculate_tem.py")
    res = subprocess.run(["python3", calc_script], capture_output=True, text=True)
    if res.returncode == 0:
        print("Recalculation finished successfully.")
        print(res.stdout)
    else:
        print("Recalculation failed:")
        print(res.stderr)
        sys.exit(res.returncode)

if __name__ == "__main__":
    main()

import openpyxl
import pymongo

CONNECTION_STRING = "mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem"
DATABASE_NAME = "tem"

YEAR_HEADERS = [-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
COL_START = 5 # Col E

def verify():
    print("Connecting to MongoDB...")
    client = pymongo.MongoClient(CONNECTION_STRING)
    db = client[DATABASE_NAME]
    
    scenario_key = "Departmental_Yes_Commercial_SurfaceMiner"
    computed = db["computed_results"].find_one({"scenarioKey": scenario_key})
    if not computed:
        print(f"Computed results not found for scenario: {scenario_key}")
        return
        
    print(f"Loaded scenario from DB: {scenario_key}")
    
    print("Loading Excel workbook...")
    wb = openpyxl.load_workbook("/Users/rishidas/Documents/Internship_SRK/TEM_Mining/TEM_interface/IN1411_Radhikapur_Option 3_15 Mtpa_rev1_20260612.xlsx", data_only=True)
    
    # helper to get year values from Excel row
    def get_excel_row_values(sheet_name, row_idx):
        sheet = wb[sheet_name]
        res = {}
        for idx, y in enumerate(YEAR_HEADERS):
            val = sheet.cell(row_idx, COL_START + idx).value
            res[str(y)] = float(val) if isinstance(val, (int, float)) else 0.0
        return res

    # Define validation rules:
    # (Label, Excel Sheet, Excel Row, Computed Category, Computed Subkey)
    validations = [
        # 1. Government Fees (Government Sheet)
        ("Gov: Final Revenue Sharing", "Government", 18, "government", "final_revenue_sharing"),
        ("Gov: GST on Revenue Sharing", "Government", 19, "government", "gst_revenue_sharing"),
        ("Gov: Royalty", "Government", 20, "government", "royalty"),
        ("Gov: DMF", "Government", 21, "government", "dmf"),
        ("Gov: NMET", "Government", 22, "government", "nmet"),
        ("Gov: Surface Rent", "Government", 24, "government", "surface_rent"),
        ("Gov: GST on Royalty etc", "Government", 30, "government", "gst_royalty_etc"),
        ("Gov: Total (excluding MC/Bank Fee)", "Government", 31, "government", "total_fees"),
        ("Gov: Mine Closure Cost", "Government", 35, "government", "mine_closure"),
        
        # 2. Owner OPEX (Owner OPEX Sheet)
        ("Opex: Diesel", "Owner OPEX", 56, "opex", "diesel"),
        ("Opex: Lubrication", "Owner OPEX", 57, "opex", "lubrication"),
        ("Opex: Spares", "Owner OPEX", 58, "opex", "spares"),
        ("Opex: Tyres", "Owner OPEX", 59, "opex", "tyres"),
        ("Opex: CHP", "Owner OPEX", 60, "opex", "chp"),
        ("Opex: Power", "Owner OPEX", 61, "opex", "power"),
        ("Opex: Owner Wage", "Owner OPEX", 62, "opex", "wage"),
        ("Opex: Explosives", "Owner OPEX", 63, "opex", "explosives"),
        ("Opex: Civil Maint", "Owner OPEX", 64, "opex", "civil_infra"),
        ("Opex: Railway Maint", "Owner OPEX", 65, "opex", "railway"),
        ("Opex: Fire Fighting", "Owner OPEX", 66, "opex", "fire"),
        ("Opex: Rehandling", "Owner OPEX", 67, "opex", "rehandling"),
        ("Opex: Digitalisation", "Owner OPEX", 68, "opex", "digital"),
        ("Opex: Env & OHS", "Owner OPEX", 69, "opex", "env"),
        ("Opex: Other Misc", "Owner OPEX", 70, "opex", "misc"),
        ("Opex: Admin & Overhead", "Owner OPEX", 71, "opex", "admin"),
        ("Opex: R&R", "Owner OPEX", 72, "opex", "rr"),
        ("Opex: Contingency", "Owner OPEX", 73, "opex", "contingency"),
        ("Opex: Subtotal Consumables", "Owner OPEX", 74, "opex", "subtotal"),
        
        # 3. Project Grand Total OPEX
        ("Opex: Project Grand Total", "Owner OPEX", 92, "project_grand_total_opex", None),
        
        # 4. CAPEX (Owner CAPEX Sheet)
        ("Owner Capex: Initial Total", "Owner CAPEX", 26, "capex", "owner_initial"),
        ("Owner Capex: Sustaining Total", "Owner CAPEX", 39, "capex", "owner_sustaining"),
        ("Owner Capex: Grand Total", "Owner CAPEX", 41, "capex", "owner_total")
    ]
    
    results = computed["results"]
    mismatches = 0
    
    for label, sheet, row, cat, subkey in validations:
        excel_vals = get_excel_row_values(sheet, row)
        if subkey is None:
            comp_vals = results.get(cat, {})
        else:
            comp_vals = results.get(cat, {}).get(subkey, {})
            
        max_diff = 0.0
        diff_years = []
        for y in YEAR_HEADERS:
            y_str = str(y)
            e_val = excel_vals.get(y_str, 0.0)
            c_val = float(comp_vals.get(y_str, 0.0))
            diff = abs(e_val - c_val)
            if diff > max_diff:
                max_diff = diff
            if diff > 1e-4:
                diff_years.append((y, e_val, c_val, diff))
                
        if max_diff < 1e-4:
            print(f"✅ {label:<38s}: MATCHED (Max Diff: {max_diff:.6f})")
        else:
            print(f"❌ {label:<38s}: MISMATCH (Max Diff: {max_diff:.6f})")
            mismatches += 1
            for y, e_val, c_val, diff in diff_years[:3]:
                print(f"   Year {y:3d}: Excel={e_val:12.6f}, Calculated={c_val:12.6f}, Diff={diff:12.6f}")
                
    if mismatches == 0:
        print("\n🎉 ALL AUDITED ITEMS MATCHED EXCEL PERFECTLY!")
    else:
        print(f"\nFound {mismatches} mismatches.")

if __name__ == "__main__":
    verify()

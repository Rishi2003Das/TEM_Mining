import openpyxl
import math

EXCEL_PATH = "/Users/rishidas/Documents/Internship_SRK/TEM_Mining/TEM_interface/IN1411_Radhikapur_Option 3_15 Mtpa_rev1_20260612.xlsx"
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)

YEAR_HEADERS = [-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

def get_row_values(sheet_name, row_idx, start_col=7):
    sheet = wb[sheet_name]
    res = {}
    for idx, y in enumerate(YEAR_HEADERS):
        val = sheet.cell(row_idx, start_col + idx).value
        res[str(y)] = float(val) if isinstance(val, (int, float)) else 0.0
    return res

# Load volumes from Production Schedule
prod_coal = get_row_values("Production Schedule", 5, start_col=5)
partings = get_row_values("Production Schedule", 11, start_col=5)

def calculate_4_equip_costs(yearly_coal_prod, yearly_partings, machinery_mode):
    specs = {
        "drill": {"cost": 0.58, "life": 5, "spares": 0.10, "fuel_avg": 28.0, "hrs_yr": 4435.2, "tyres_nos": 0, "tyre_cost": 0.0, "lub_factor": 0.05},
        "shovel": {"cost": 4.35, "life": 6, "spares": 0.125, "fuel_avg": 48.0, "hrs_yr": 4752.0, "tyres_nos": 0, "tyre_cost": 0.0, "lub_factor": 0.05},
        "sm": {"cost": 7.67, "life": 5, "spares": 1.0/6.0, "fuel_avg": 90.0, "hrs_yr": 5385.6, "tyres_nos": 0, "tyre_cost": 0.0, "lub_factor": 0.05},
        "fel": {"cost": 4.52, "life": 5, "spares": 1.0/6.0, "fuel_avg": 55.0, "hrs_yr": 5722.2, "tyres_nos": 4, "tyre_cost": 150000.0 / 1e7, "lub_factor": 0.20}
    }
    
    diesel_price = 95.0
    rd_coal = 1.72
    
    fractional = {eq: {} for eq in specs}
    final_size = {eq: {} for eq in specs}
    
    for yr in YEAR_HEADERS:
        yr_str = str(yr)
        prod = yearly_coal_prod.get(yr_str, 0.0)
        part = yearly_partings.get(yr_str, 0.0)
        
        if yr <= 0:
            blasted = 0.0
            sm_coal = 0.0
        else:
            if machinery_mode == "Surface Miner":
                if yr <= 2:
                    blasted = prod
                    sm_coal = 0.0
                else:
                    blasted = prod * 0.15
                    sm_coal = prod - blasted
            else:
                blasted = prod
                sm_coal = 0.0
                
        # 1. Drill 115mm
        if yr <= 0:
            f_drill = 0.0
        else:
            f_drill = (blasted / rd_coal * 1e6) / 2822400.0
        fractional["drill"][yr_str] = f_drill
        final_size["drill"][yr_str] = math.ceil(f_drill)
        
        # 2. Shovel 4.6
        if yr <= 0:
            f_shovel = 0.0
        else:
            material_shovel = blasted / rd_coal + part * 0.3
            f_shovel = (material_shovel * 1e6) / 1341360.0
        fractional["shovel"][yr_str] = f_shovel
        final_size["shovel"][yr_str] = math.ceil(f_shovel)
        
        # 3. SM 2200SM
        if yr <= 0:
            f_sm = 0.0
        else:
            f_sm = (sm_coal * 1e6) / 5002145.28
        fractional["sm"][yr_str] = f_sm
        final_size["sm"][yr_str] = math.ceil(f_sm)
        
        # 4. FEL 6.4
        if yr <= 0:
            f_fel = 0.0
        else:
            f_fel = (sm_coal / rd_coal * 1e6) / 2137937.64
        fractional["fel"][yr_str] = f_fel
        final_size["fel"][yr_str] = math.ceil(f_fel)

    phasing = {eq: {} for eq in specs}
    replacement = {eq: {} for eq in specs}
    
    for eq, eq_specs in specs.items():
        life = eq_specs["life"]
        max_prior = 0.0
        
        for yr in YEAR_HEADERS:
            yr_str = str(yr)
            size = final_size[eq][yr_str]
            p = max(0.0, size - max_prior)
            phasing[eq][yr_str] = float(math.ceil(p))
            max_prior = max(max_prior, size)
            
        for yr in YEAR_HEADERS:
            yr_str = str(yr)
            if yr <= life:
                r = 0.0
            else:
                ref_y = (yr - life - 1) % life + 1
                ref_y_str = str(ref_y)
                r = phasing[eq][ref_y_str]
            replacement[eq][yr_str] = float(r)

    costs = {
        "initial_capex": {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)},
        "sustaining_capex": {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)},
        "diesel": {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)},
        "lubrication": {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)},
        "spares": {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)},
        "tyres": {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)}
    }
    
    for eq, eq_specs in specs.items():
        cost_unit = eq_specs["cost"]
        spares_pct = eq_specs["spares"]
        fuel_avg = eq_specs["fuel_avg"]
        hrs_yr = eq_specs["hrs_yr"]
        tyres_nos = eq_specs["tyres_nos"]
        tyre_cost = eq_specs["tyre_cost"]
        lub_factor = eq_specs["lub_factor"]
        
        rate_diesel = fuel_avg * hrs_yr * diesel_price / 1e7
        rate_spares = cost_unit * spares_pct
        rate_tyres = tyres_nos * tyre_cost
        
        for yr in YEAR_HEADERS:
            yr_str = str(yr)
            p_count = phasing[eq][yr_str]
            r_count = replacement[eq][yr_str]
            frac_count = fractional[eq][yr_str]
            
            costs["initial_capex"][yr_str] += p_count * cost_unit
            costs["sustaining_capex"][yr_str] += r_count * cost_unit
            
            eq_diesel = frac_count * rate_diesel
            eq_lub = eq_diesel * lub_factor
            eq_spares = frac_count * rate_spares
            eq_tyres = frac_count * rate_tyres
            
            costs["diesel"][yr_str] += eq_diesel
            costs["lubrication"][yr_str] += eq_lub
            costs["spares"][yr_str] += eq_spares
            costs["tyres"][yr_str] += eq_tyres
            
    for category in ["initial_capex", "sustaining_capex", "diesel", "lubrication", "spares", "tyres"]:
        for yr_str in costs[category]:
            costs[category][yr_str] = round(costs[category][yr_str], 6)
            
    return costs

# Load Excel actual sums for these 4 equipment types
excel_initial = {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)}
excel_sustaining = {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)}
excel_diesel = {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)}
excel_lub = {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)}
excel_spares = {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)}
excel_tyres = {yr_str: 0.0 for yr_str in map(str, YEAR_HEADERS)}

# Fetch rows
d115_in = get_row_values("Fleet", 324, start_col=7)
s46_in = get_row_values("Fleet", 328, start_col=7)
sm22_in = get_row_values("Fleet", 332, start_col=7)
fel64_in = get_row_values("Fleet", 333, start_col=7)

d115_sust = get_row_values("Fleet", 371, start_col=7)
s46_sust = get_row_values("Fleet", 375, start_col=7)
sm22_sust = get_row_values("Fleet", 379, start_col=7)
fel64_sust = get_row_values("Fleet", 380, start_col=7)

# Start column is 5 for Equipment Op Cost!
diesel_d115 = get_row_values("Equipment Op Cost", 6, start_col=5)
diesel_s46 = get_row_values("Equipment Op Cost", 10, start_col=5)
diesel_sm22 = get_row_values("Equipment Op Cost", 14, start_col=5)
diesel_fel64 = get_row_values("Equipment Op Cost", 15, start_col=5)

lub_d115 = get_row_values("Equipment Op Cost", 52, start_col=5)
lub_s46 = get_row_values("Equipment Op Cost", 56, start_col=5)
lub_sm22 = get_row_values("Equipment Op Cost", 60, start_col=5)
lub_fel64 = get_row_values("Equipment Op Cost", 61, start_col=5)

spares_d115 = get_row_values("Equipment Op Cost", 97, start_col=5)
spares_s46 = get_row_values("Equipment Op Cost", 101, start_col=5)
spares_sm22 = get_row_values("Equipment Op Cost", 105, start_col=5)
spares_fel64 = get_row_values("Equipment Op Cost", 106, start_col=5)

tyres_d115 = get_row_values("Equipment Op Cost", 142, start_col=5)
tyres_s46 = get_row_values("Equipment Op Cost", 146, start_col=5)
tyres_sm22 = get_row_values("Equipment Op Cost", 150, start_col=5)
tyres_fel64 = get_row_values("Equipment Op Cost", 151, start_col=5)

for yr_str in map(str, YEAR_HEADERS):
    excel_initial[yr_str] = d115_in[yr_str] + s46_in[yr_str] + sm22_in[yr_str] + fel64_in[yr_str]
    excel_sustaining[yr_str] = d115_sust[yr_str] + s46_sust[yr_str] + sm22_sust[yr_str] + fel64_sust[yr_str]
    
    excel_diesel[yr_str] = diesel_d115[yr_str] + diesel_s46[yr_str] + diesel_sm22[yr_str] + diesel_fel64[yr_str]
    excel_lub[yr_str] = lub_d115[yr_str] + lub_s46[yr_str] + lub_sm22[yr_str] + lub_fel64[yr_str]
    excel_spares[yr_str] = spares_d115[yr_str] + spares_s46[yr_str] + spares_sm22[yr_str] + spares_fel64[yr_str]
    excel_tyres[yr_str] = tyres_d115[yr_str] + tyres_s46[yr_str] + tyres_sm22[yr_str] + tyres_fel64[yr_str]

# Run calculations
calc = calculate_4_equip_costs(prod_coal, partings, "Surface Miner")

# Verify
mismatches = 0
for cat, calc_vals, excel_vals in [
    ("Initial Capex", calc["initial_capex"], excel_initial),
    ("Sustaining Capex", calc["sustaining_capex"], excel_sustaining),
    ("Diesel", calc["diesel"], excel_diesel),
    ("Lubrication", calc["lubrication"], excel_lub),
    ("Spares", calc["spares"], excel_spares),
    ("Tyres", calc["tyres"], excel_tyres),
]:
    diff = sum(abs(calc_vals[y] - excel_vals[y]) for y in map(str, YEAR_HEADERS))
    if diff > 1e-4:
        print(f"❌ {cat} Diff: {diff:.6f}")
        mismatches += 1
        for y in YEAR_HEADERS:
            y_str = str(y)
            if abs(calc_vals[y_str] - excel_vals[y_str]) > 1e-4:
                print(f"   Yr {y:3d} | Calc={calc_vals[y_str]:.6f} | Excel={excel_vals[y_str]:.6f} | Diff={abs(calc_vals[y_str]-excel_vals[y_str]):.6f}")
    else:
        print(f"✅ {cat} Matched perfectly!")

if mismatches == 0:
    print("\n🎉 ALL 6 CATEGORIES MATCHED EXCEL PERFECTLY UNDER SURFACE MINER MODE!")
else:
    print(f"\nFound {mismatches} category mismatches.")

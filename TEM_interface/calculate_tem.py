import datetime
import os
import pymongo

# MongoDB connection configuration
CONNECTION_STRING = os.environ.get("MONGODB_URI", "mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "tem")

YEAR_HEADERS = [-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

def parse_rate(val):
    if val is None:
        return 0.0
    val_str = str(val).strip()
    if val_str.endswith('%'):
        return float(val_str.rstrip('%')) / 100.0
    val_str = val_str.replace(',', '')
    try:
        return float(val_str)
    except ValueError:
        return val

def run_calculation():
    print("Connecting to MongoDB...")
    client = pymongo.MongoClient(CONNECTION_STRING)
    db = client[DATABASE_NAME]
    
    # 1. Load all schedules from MongoDB
    def load_schedule_dict(col_name):
        col = db[col_name]
        data = {}
        for doc in col.find():
            item = doc.get("item")
            data[item] = doc.get("yearly_values", {})
        return data

    print("Loading schedules from database...")
    production_sched = load_schedule_dict("production_schedule")
    pre_operative_sched = load_schedule_dict("pre_operative_schedule")
    land_sched = load_schedule_dict("land_schedule")
    rr_sched = load_schedule_dict("rr_schedule")
    coal_price_sched = load_schedule_dict("coal_price_schedule")
    capex_breakups_sched = load_schedule_dict("capex_breakups_schedule")
    fleet_replacement_sched = load_schedule_dict("fleet_replacement_schedule")
    wages_sched = load_schedule_dict("wages_schedule")
    owner_opex_sched = load_schedule_dict("owner_opex_schedule")
    
    # Extract specific series
    # Production
    prod_coal = production_sched.get("Production Coal/Ore", {})
    waste_rem = production_sched.get("Waste (Topsoil + Overburden + Interburden)", {})
    waste_rehandle = production_sched.get("Waste - Rehandle", {})
    topsoil_sched = production_sched.get("Topsoil", {})
    
    # Pre-operative
    pre_op_total = pre_operative_sched.get("Total", {})
    if not pre_op_total:
        # Fallback if description is different
        for k in pre_operative_sched.keys():
            if "total" in k.lower() and "excluding" not in k.lower():
                pre_op_total = pre_operative_sched[k]
                break
                
    # Land and R&R
    land_cost = land_sched.get("Land Costs, (INR Crore)", {})
    rr_cost = rr_sched.get("R&R", {})
    
    # Coal Price
    nci_price = coal_price_sched.get("NCI Price as per Mine Design Grade", {})
    comm_price = coal_price_sched.get("Market Price/Commercial Price of Coal", {})
    
    # Capex Breakups
    chp_initial = capex_breakups_sched.get("CHP", {})
    siding_initial = capex_breakups_sched.get("Railway Siding", {})
    civil_initial = capex_breakups_sched.get("Civil Infrastructure, Roads, Water Supply etc.", {})
    fire_initial = capex_breakups_sched.get("Fire Fighting/Dust Suppression/Cleaning system etc.", {})
    workshop_initial = capex_breakups_sched.get("Workshop and Store (E&M)", {})
    electrical_initial = capex_breakups_sched.get("Electrical", {})
    dewatering_initial = capex_breakups_sched.get("Mine Dewatering System", {})
    digital_initial = capex_breakups_sched.get("Digitalisation", {})
    
    # Fleet
    hemm_initial = fleet_replacement_sched.get("Total Initial Capital Requirement - Equipment", {})
    hemm_sustaining = fleet_replacement_sched.get("Total Replacement Capital Requirement - Equipment", {})
    
    # Wages
    owner_wages = wages_sched.get("Total Wages", {})
    
    # 2. Hard inputs
    def get_hard_input_val(col_name, key_name, field_name="Value"):
        doc = db[col_name].find_one({"key": key_name})
        if doc:
            return parse_rate(doc.get(field_name) or doc.get("Base Rate") or doc.get("Values"))
        return 0.0

    print("Loading hard inputs...")
    capital_contingency = get_hard_input_val("unit_rates_opcosts", "capital_cost_contingency")
    opex_contingency_rate = get_hard_input_val("unit_rates_opcosts", "operating_cost_contingency")
    chp_sustaining_rate = get_hard_input_val("govt_fees_charges", "ml_area") # Wait, ml_area isn't CHP sustaining rate. Let's load the CHP rate directly.
    # Let's inspect the exact key. CHP sustaining rate is Assumptions_Dashboard!D117 = 0.03
    # Let's write code to get it or fallback to 0.03
    chp_sustaining_rate = 0.03
    civil_sustaining_rate = 0.035
    
    # MDO rates
    mdo_topsoil_rate = get_hard_input_val("mdo_assumption", "top_soil_removal_transportation_and_stacking_within_3_0km_lead")
    mdo_ob_rate = get_hard_input_val("mdo_assumption", "mdo_material_ob_ib_drillin_blasting_explosive_removal_transportation_and_stacking_within_3_0km")
    mdo_coal_rate = get_hard_input_val("mdo_assumption", "coal_drilling_blasting_surface_miner_explosive_removal_trasnportaion_and_stacking_within_3_0km")
    mdo_rehandle_rate = get_hard_input_val("mdo_assumption", "ob_rehandling_cost")
    
    # Env & Opex rates
    diesel_base_price = get_hard_input_val("unit_rates_opcosts", "base_diesel_cost_5_percent_discount_on_bulk_purchase")
    power_charge_rate = get_hard_input_val("unit_rates_opcosts", "power_charge")
    admin_cost_rate = get_hard_input_val("unit_rates_opcosts", "administrative_cost")
    
    # Production Schedule Parameters (new hard inputs)
    partings_percent = get_hard_input_val("production_schedule_params", "partings_percent")
    if partings_percent == 0:
        partings_percent = 0.77  # fallback default
    chp_rehandling_rate = get_hard_input_val("production_schedule_params", "chp_rehandling_rate")
    if chp_rehandling_rate == 0:
        chp_rehandling_rate = 0.05  # fallback default
    chp_rehandling_capacity = get_hard_input_val("production_schedule_params", "chp_rehandling_capacity")
    if chp_rehandling_capacity == 0:
        chp_rehandling_capacity = 1.72  # fallback default
    blasted_coal_fraction = get_hard_input_val("production_schedule_params", "blasted_coal_fraction")
    if blasted_coal_fraction == 0:
        blasted_coal_fraction = 0.15  # fallback default
    sm_threshold_year = get_hard_input_val("production_schedule_params", "sm_threshold_year")
    if sm_threshold_year == 0:
        sm_threshold_year = 2  # fallback default
    available_hours_per_year = get_hard_input_val("production_schedule_params", "available_hours_per_year")
    if available_hours_per_year == 0:
        available_hours_per_year = 7920  # fallback default
    bench_height_coal = get_hard_input_val("production_schedule_params", "bench_height_coal")
    bench_width_coal = get_hard_input_val("production_schedule_params", "bench_width_coal")
    bench_height_ob = get_hard_input_val("production_schedule_params", "bench_height_ob_ib")
    bench_width_ob = get_hard_input_val("production_schedule_params", "bench_width_ob_ib")
    
    print(f"  Production Schedule Params loaded:")
    print(f"    Partings %: {partings_percent}, CHP Rate: {chp_rehandling_rate}, CHP Cap: {chp_rehandling_capacity}")
    print(f"    Blasted Frac: {blasted_coal_fraction}, SM Threshold Yr: {sm_threshold_year}")
    print(f"    Bench Coal: {bench_height_coal}m x {bench_width_coal}m, Bench OB: {bench_height_ob}m x {bench_width_ob}m")
    
    # Pre-compute derived schedules from Production Schedule hard inputs
    # These are computed once (not per-scenario) since they depend on production data, not switches
    computed_partings = {}      # Row 11: Partings = waste × partings_percent
    computed_ob = {}            # Row 10: OB = waste - topsoil - part
    computed_chp_reh = {}       # Row 12: CHP Rehandling = prod / chp_capacity × chp_rate
    computed_blasted = {}       # Row 6:  Blasted coal
    computed_sm_coal = {}       # Row 7:  Surface Miner coal
    computed_stripping_ratio = {} # Row 19: YoY Stripping Ratio = waste / prod
    computed_rehandling_cost = {} # Row 35: Rehandling Cost = mdo_rehandle_rate × waste_rehandle / 10
    
    clean_coal_prod = {}
    clean_waste_rem = {}
    clean_topsoil = {}
    clean_waste_rehandle = {}
    
    for yr in YEAR_HEADERS:
        yr_str = str(yr)
        prod = float(prod_coal.get(yr_str, 0.0))
        waste = float(waste_rem.get(yr_str, 0.0))
        topsoil = float(topsoil_sched.get(yr_str, 0.0))
        waste_reh = float(waste_rehandle.get(yr_str, 0.0))
        
        clean_coal_prod[yr_str] = round(prod, 6)
        clean_waste_rem[yr_str] = round(waste, 6)
        clean_topsoil[yr_str] = round(topsoil, 6)
        clean_waste_rehandle[yr_str] = round(waste_reh, 6)
        
        # Partings (Row 11)
        part = waste * partings_percent
        computed_partings[yr_str] = round(part, 6)
        
        # OB (Row 10)
        ob_val = waste - topsoil - part
        computed_ob[yr_str] = round(max(ob_val, 0), 6)
        
        # CHP Rehandling (Row 12)
        if chp_rehandling_capacity > 0:
            chp_reh_val = prod / chp_rehandling_capacity * chp_rehandling_rate
        else:
            chp_reh_val = 0.0
        computed_chp_reh[yr_str] = round(chp_reh_val, 6)
        
        # Blasted Coal (Row 6)
        if yr <= 0:
            blasted = 0.0
        elif sm_threshold_year >= yr:
            blasted = prod  # All coal is blasted before SM takes over
        else:
            blasted = prod * blasted_coal_fraction
        computed_blasted[yr_str] = round(blasted, 6)
        
        # Surface Miner Coal (Row 7)
        sm_coal_val = prod - blasted
        computed_sm_coal[yr_str] = round(max(sm_coal_val, 0), 6)
        
        # Stripping Ratio (Row 19)
        if prod > 0:
            sr = waste / prod
        else:
            sr = 0.0
        computed_stripping_ratio[yr_str] = round(sr, 6)
        
        # Rehandling Cost (Row 35)
        reh_cost = mdo_rehandle_rate * waste_reh / 10.0
        computed_rehandling_cost[yr_str] = round(reh_cost, 6)
    
    print("  Derived schedules computed (Partings, OB, CHP Reh, Blasted/SM Coal, Stripping Ratio, Rehandling Cost)")
    
    # 3. Perform calculation for all 8 combinations of switches
    # L4: Mining Mode -> "Departmental" or "MDO"
    # L6: Pre-Tax / Pre-Finance -> "Yes" or "No" (Pre-tax pre-finance is Yes, which means IDC is 0. If No, IDC is computed)
    # L8: Coal Price Type -> "Commercial" or "NCI"
    
    scenarios = [
        ("Departmental", "Yes", "Commercial"),
        ("Departmental", "Yes", "NCI"),
        ("Departmental", "No", "Commercial"),
        ("Departmental", "No", "NCI"),
        ("MDO", "Yes", "Commercial"),
        ("MDO", "Yes", "NCI"),
        ("MDO", "No", "Commercial"),
        ("MDO", "No", "NCI")
    ]
    
    computed_results_col = db["computed_results"]
    computed_results_col.delete_many({})
    
    for mining_mode, pre_tax_pre_finance, coal_price_type in scenarios:
        print(f"Calculating scenario: {mining_mode} | Pre-tax: {pre_tax_pre_finance} | Price: {coal_price_type}...")
        
        scenario_key = f"{mining_mode}_{pre_tax_pre_finance}_{coal_price_type}"
        
        # Intermediate/computed values
        cumulative_upfront_offset = 0.0
        upfront_limit = 99.07
        
        capex_initial_owner = {}
        capex_sustaining_owner = {}
        capex_total_owner = {}
        
        capex_initial_mdo = {}
        capex_sustaining_mdo = {}
        capex_total_mdo = {}
        
        capex_initial_project = {}
        capex_sustaining_project = {}
        capex_total_project = {}
        
        # OPEX absolute values (INR Cr)
        opex_diesel = {}
        opex_lubrication = {}
        opex_spares = {}
        opex_tyres = {}
        opex_chp = {}
        opex_power = {}
        opex_wage = {}
        opex_explosives = {}
        opex_civil_maint = {}
        opex_railway_maint = {}
        opex_fire = {}
        opex_rehandling = {}
        opex_digital = {}
        opex_env = {}
        opex_misc = {}
        opex_admin = {}
        opex_rr = {}
        opex_contingency = {}
        opex_subtotal = {}
        
        # MDO Contractor cost (INR Cr)
        opex_mdo_contractor = {}
        
        # Government Fees (INR Cr)
        gov_revenue_sharing = {}
        gov_adjusted_upfront = {}
        gov_final_rev_sharing = {}
        gov_gst_rev_sharing = {}
        gov_royalty = {}
        gov_dmf = {}
        gov_nmet = {}
        gov_surface_rent = {}
        gov_gst_royalty_etc = {}
        gov_mine_closure = {}
        gov_bank_fee = {}
        gov_total_fees = {}
        gov_total_fees_with_mc_bank = {}
        
        # Grand Total Project OPEX (INR Cr)
        project_grand_total_opex = {}
        
        # Initialize mine closure recursion
        prev_mine_closure_val = 0.0
        
        for year in YEAR_HEADERS:
            yr_str = str(year)
            prod = float(prod_coal.get(yr_str, 0.0))
            waste = float(waste_rem.get(yr_str, 0.0))
            waste_reh = float(waste_rehandle.get(yr_str, 0.0))
            nci = float(nci_price.get(yr_str, 0.0))
            comm = float(comm_price.get(yr_str, 0.0))
            
            # ----------------------------------------------------
            # 1. CAPEX Calculations (INR Cr)
            # ----------------------------------------------------
            pre_op = float(pre_op_total.get(yr_str, 0.0))
            
            # Upfront payment schedule
            if year == -4:
                upfront = 24.7675
            elif year == -1:
                upfront = 24.7675
            elif year == 1:
                upfront = 49.535
            else:
                upfront = 0.0
                
            land = float(land_cost.get(yr_str, 0.0))
            rr = float(rr_cost.get(yr_str, 0.0))
            
            # CHP, Railway Siding, Civil Infra, Fire, Electrical, Digitalisation are always Owner CAPEX
            chp = float(chp_initial.get(yr_str, 0.0))
            siding = float(siding_initial.get(yr_str, 0.0))
            civil = float(civil_initial.get(yr_str, 0.0))
            fire = float(fire_initial.get(yr_str, 0.0))
            electrical = float(electrical_initial.get(yr_str, 0.0))
            digital = float(digital_initial.get(yr_str, 0.0))
            
            # HEMM, Workshop, Dewatering depend on mode
            if mining_mode == "Departmental":
                hemm = float(hemm_initial.get(yr_str, 0.0))
                workshop = float(workshop_initial.get(yr_str, 0.0))
                dewatering = float(dewatering_initial.get(yr_str, 0.0))
            else:
                hemm = 0.0
                workshop = 0.0
                dewatering = 0.0
                
            # Owner Initial contingency
            # 15% of sum of all items except Upfront Amount
            initial_owner_sum = pre_op + land + rr + hemm + chp + siding + civil + fire + workshop + electrical + dewatering + digital
            owner_initial_cont = initial_owner_sum * 0.15
            owner_idc = 0.0
            
            owner_initial_tot = initial_owner_sum + upfront + owner_initial_cont + owner_idc
            
            # Owner Sustaining capex
            if mining_mode == "Departmental":
                mining_repl = float(hemm_sustaining.get(yr_str, 0.0))
            else:
                mining_repl = 0.0
                
            # CHP Sustaining: 3% of initial CHP cost (335.19 Cr) in Year 8 and Year 16
            if year in [8, 16]:
                chp_sust = 335.19 * chp_sustaining_rate
            else:
                chp_sust = 0.0
                
            # Civil Infra Sustaining: 3.5% of initial Civil cost (191.0 Cr) in Year 10
            if year == 10:
                civil_sust = 191.0 * civil_sustaining_rate
            else:
                civil_sust = 0.0
                
            owner_sust_cont = (mining_repl + chp_sust + civil_sust) * 0.15
            owner_sust_tot = mining_repl + chp_sust + civil_sust + owner_sust_cont
            
            # Owner Total Capex
            owner_tot_capex = owner_initial_tot + owner_sust_tot
            
            capex_initial_owner[yr_str] = round(owner_initial_tot, 6)
            capex_sustaining_owner[yr_str] = round(owner_sust_tot, 6)
            capex_total_owner[yr_str] = round(owner_tot_capex, 6)
            
            # MDO CAPEX
            if mining_mode == "MDO":
                mdo_hemm = float(hemm_initial.get(yr_str, 0.0))
                mdo_workshop = float(workshop_initial.get(yr_str, 0.0))
                mdo_dewatering = float(dewatering_initial.get(yr_str, 0.0))
                mdo_initial_cont = (mdo_hemm + mdo_workshop + mdo_dewatering) * 0.15
                mdo_initial_tot = mdo_hemm + mdo_workshop + mdo_dewatering + mdo_initial_cont
                
                mdo_mining_repl = float(hemm_sustaining.get(yr_str, 0.0))
                mdo_sust_cont = mdo_mining_repl * 0.15
                mdo_sust_tot = mdo_mining_repl + mdo_sust_cont
                mdo_tot_capex = mdo_initial_tot + mdo_sust_tot
            else:
                mdo_hemm = 0.0
                mdo_workshop = 0.0
                mdo_dewatering = 0.0
                mdo_initial_cont = 0.0
                mdo_initial_tot = 0.0
                mdo_mining_repl = 0.0
                mdo_sust_cont = 0.0
                mdo_sust_tot = 0.0
                mdo_tot_capex = 0.0
                
            capex_initial_mdo[yr_str] = round(mdo_initial_tot, 6)
            capex_sustaining_mdo[yr_str] = round(mdo_sust_tot, 6)
            capex_total_mdo[yr_str] = round(mdo_tot_capex, 6)
            
            # Project CAPEX (Owner + MDO)
            project_initial_tot = owner_initial_tot + mdo_initial_tot
            project_sust_tot = owner_sust_tot + mdo_sust_tot
            project_tot_capex = owner_tot_capex + mdo_tot_capex
            
            capex_initial_project[yr_str] = round(project_initial_tot, 6)
            capex_sustaining_project[yr_str] = round(project_sust_tot, 6)
            capex_total_project[yr_str] = round(project_tot_capex, 6)
            
            # ----------------------------------------------------
            # 2. OPEX Calculations (INR Cr)
            # ----------------------------------------------------
            if year <= 0:
                # Opex is 0 in pre-production years
                for d in [opex_diesel, opex_lubrication, opex_spares, opex_tyres, opex_chp, opex_power,
                          opex_wage, opex_explosives, opex_civil_maint, opex_railway_maint, opex_fire,
                          opex_rehandling, opex_digital, opex_env, opex_misc, opex_admin, opex_rr,
                          opex_contingency, opex_subtotal, opex_mdo_contractor]:
                    d[yr_str] = 0.0
            else:
                # In production years
                # If Departmental mode, fetch departmental items from Owner OPEX sheet
                if mining_mode == "Departmental":
                    diesel_val = float(owner_opex_sched.get("Diesel", {}).get(yr_str, 0.0))
                    lub_val = float(owner_opex_sched.get("Lubrication", {}).get(yr_str, 0.0))
                    spares_val = float(owner_opex_sched.get("HEMM Spares (including drill consumables)", {}).get(yr_str, 0.0))
                    tyres_val = float(owner_opex_sched.get("Tyres", {}).get(yr_str, 0.0))
                    explosives_val = float(owner_opex_sched.get("Explosives", {}).get(yr_str, 0.0))
                    rehandling_val = float(owner_opex_sched.get("Rehandling", {}).get(yr_str, 0.0))
                else:
                    diesel_val = 0.0
                    lub_val = 0.0
                    spares_val = 0.0
                    tyres_val = 0.0
                    explosives_val = 0.0
                    rehandling_val = 0.0
                    
                chp_val = float(owner_opex_sched.get("CHP", {}).get(yr_str, 0.0))
                power_val = float(owner_opex_sched.get("Power", {}).get(yr_str, 0.0))
                
                # Wage is Total Wages from wages_sched
                wage_val = float(owner_wages.get(yr_str, 0.0))
                
                # Maintenance items
                civil_maint_val = float(owner_opex_sched.get("Civil Infrastructure", {}).get(yr_str, 0.0))
                railway_maint_val = float(owner_opex_sched.get("Railway Track & Siding", {}).get(yr_str, 0.0))
                fire_val = float(owner_opex_sched.get("Fire Fighting & Dust Suppression", {}).get(yr_str, 0.0))
                digital_val = float(owner_opex_sched.get("Digitalisation (AMC)", {}).get(yr_str, 0.0))
                
                env_val = float(owner_opex_sched.get("Environment Management & OHS  costs", {}).get(yr_str, 0.0))
                misc_val = float(owner_opex_sched.get("Other Misc.", {}).get(yr_str, 0.0))
                
                # Admin: 15 * Production / 10
                admin_val = 15.0 * prod / 10.0
                rr_val = float(owner_opex_sched.get("R&R", {}).get(yr_str, 0.0))
                
                # Contractor/MDO Cost
                if mining_mode == "MDO":
                    # MDO OB cost uses decomposed OB volume (waste - topsoil - partings)
                    ob_vol = float(computed_ob.get(yr_str, 0.0))
                    mdo_ob = ob_vol * mdo_ob_rate / 10.0
                    # MDO Topsoil cost
                    topsoil_vol = float(topsoil_sched.get(yr_str, 0.0))
                    mdo_topsoil = topsoil_vol * mdo_topsoil_rate / 10.0
                    # MDO Rehandling = Rehandling BCM * 70 / 10
                    mdo_reh = waste_reh * mdo_rehandle_rate / 10.0
                    # MDO Coal = Production Coal * 100 / 10
                    mdo_coal = prod * mdo_coal_rate / 10.0
                    mdo_contractor_val = mdo_ob + mdo_topsoil + mdo_reh + mdo_coal
                else:
                    mdo_contractor_val = 0.0
                    
                # Contingency: 15% of sum of consumables and owner mining costs (excluding MDO contractor cost!)
                contingency_sum = (diesel_val + lub_val + spares_val + tyres_val + chp_val + power_val +
                                   wage_val + explosives_val + civil_maint_val + railway_maint_val +
                                   fire_val + rehandling_val + digital_val + env_val + misc_val +
                                   admin_val + rr_val)
                contingency_val = contingency_sum * 0.15
                
                subtotal_val = contingency_sum + contingency_val
                
                opex_diesel[yr_str] = round(diesel_val, 6)
                opex_lubrication[yr_str] = round(lub_val, 6)
                opex_spares[yr_str] = round(spares_val, 6)
                opex_tyres[yr_str] = round(tyres_val, 6)
                opex_chp[yr_str] = round(chp_val, 6)
                opex_power[yr_str] = round(power_val, 6)
                opex_wage[yr_str] = round(wage_val, 6)
                opex_explosives[yr_str] = round(explosives_val, 6)
                opex_civil_maint[yr_str] = round(civil_maint_val, 6)
                opex_railway_maint[yr_str] = round(railway_maint_val, 6)
                opex_fire[yr_str] = round(fire_val, 6)
                opex_rehandling[yr_str] = round(rehandling_val, 6)
                opex_digital[yr_str] = round(digital_val, 6)
                opex_env[yr_str] = round(env_val, 6)
                opex_misc[yr_str] = round(misc_val, 6)
                opex_admin[yr_str] = round(admin_val, 6)
                opex_rr[yr_str] = round(rr_val, 6)
                opex_contingency[yr_str] = round(contingency_val, 6)
                opex_subtotal[yr_str] = round(subtotal_val, 6)
                opex_mdo_contractor[yr_str] = round(mdo_contractor_val, 6)
                
            # ----------------------------------------------------
            # 3. Government Fees & Taxes Calculations (INR Cr)
            # ----------------------------------------------------
            if year <= 0:
                # Upfront Payment is paid during pre-production years
                for d in [gov_revenue_sharing, gov_adjusted_upfront, gov_final_rev_sharing,
                          gov_gst_rev_sharing, gov_royalty, gov_dmf, gov_nmet, gov_surface_rent,
                          gov_gst_royalty_etc, gov_mine_closure, gov_bank_fee, gov_total_fees,
                          gov_total_fees_with_mc_bank]:
                    d[yr_str] = 0.0
                project_grand_total_opex[yr_str] = 0.0
            else:
                # NCI Price is used for Revenue Sharing and Royalty
                price_for_fees = nci
                
                # Revenue Sharing (before upfront offset) = price * production * 21% / 10
                rev_sharing = price_for_fees * prod * 0.21 / 10.0
                
                # Upfront adjustment (offset)
                remaining_upfront = upfront_limit - cumulative_upfront_offset
                upfront_offset = min(remaining_upfront, rev_sharing * 0.5)
                cumulative_upfront_offset += upfront_offset
                
                final_rev = rev_sharing - upfront_offset
                gst_rev = final_rev * 0.18
                
                # Royalty = price * production * 14% / 10
                royalty = price_for_fees * prod * 0.14 / 10.0
                dmf = royalty * 0.10
                nmet = royalty * 0.03
                
                # Surface rent is 0.2096 Cr
                surface_rent = 0.2096
                
                # GST on royalty, dmf, nmet, surface rent
                gst_roy_etc = (royalty + dmf + nmet + surface_rent) * 0.18
                
                # Mine Closure Cost
                if year == 1:
                    mine_closure_val = 9.581130604288502
                else:
                    mine_closure_val = prev_mine_closure_val * 1.05
                    
                prev_mine_closure_val = mine_closure_val
                
                bank_fee = 2.6317
                
                total_fees_val = final_rev + gst_rev + royalty + dmf + nmet + surface_rent + gst_roy_etc
                total_fees_with_mc_bank_val = total_fees_val + mine_closure_val + bank_fee
                
                gov_revenue_sharing[yr_str] = round(rev_sharing, 6)
                gov_adjusted_upfront[yr_str] = round(upfront_offset, 6)
                gov_final_rev_sharing[yr_str] = round(final_rev, 6)
                gov_gst_rev_sharing[yr_str] = round(gst_rev, 6)
                gov_royalty[yr_str] = round(royalty, 6)
                gov_dmf[yr_str] = round(dmf, 6)
                gov_nmet[yr_str] = round(nmet, 6)
                gov_surface_rent[yr_str] = round(surface_rent, 6)
                gov_gst_royalty_etc[yr_str] = round(gst_roy_etc, 6)
                gov_mine_closure[yr_str] = round(mine_closure_val, 6)
                gov_bank_fee[yr_str] = round(bank_fee, 6)
                gov_total_fees[yr_str] = round(total_fees_val, 6)
                gov_total_fees_with_mc_bank[yr_str] = round(total_fees_with_mc_bank_val, 6)
                
            # ----------------------------------------------------
            # 4. Project Grand Total OPEX (INR Cr)
            # ----------------------------------------------------
            if year <= 0:
                project_grand_total_opex[yr_str] = 0.0
            else:
                tot_opex_val = opex_subtotal[yr_str] + opex_mdo_contractor[yr_str] + total_fees_with_mc_bank_val
                project_grand_total_opex[yr_str] = round(tot_opex_val, 6)

        # Store calculated results in dictionary format
        result_doc = {
            "projectId": "tem_project_1",
            "snapshotId": "initial_snapshot",
            "scenarioKey": scenario_key,
            "computedAt": datetime.datetime.utcnow(),
            "switches": {
                "mining_mode": mining_mode,
                "pre_tax_pre_finance": pre_tax_pre_finance,
                "coal_price_type": coal_price_type
            },
            "results": {
                "capex": {
                    "owner_initial": capex_initial_owner,
                    "owner_sustaining": capex_sustaining_owner,
                    "owner_total": capex_total_owner,
                    "mdo_initial": capex_initial_mdo,
                    "mdo_sustaining": capex_sustaining_mdo,
                    "mdo_total": capex_total_mdo,
                    "project_initial": capex_initial_project,
                    "project_sustaining": capex_sustaining_project,
                    "project_total": capex_total_project
                },
                "opex": {
                    "diesel": opex_diesel,
                    "lubrication": opex_lubrication,
                    "spares": opex_spares,
                    "tyres": opex_tyres,
                    "chp": opex_chp,
                    "power": opex_power,
                    "wage": opex_wage,
                    "explosives": opex_explosives,
                    "civil_infra": opex_civil_maint,
                    "railway": opex_railway_maint,
                    "fire": opex_fire,
                    "rehandling": opex_rehandling,
                    "digital": opex_digital,
                    "env": opex_env,
                    "misc": opex_misc,
                    "admin": opex_admin,
                    "rr": opex_rr,
                    "contingency": opex_contingency,
                    "subtotal": opex_subtotal,
                    "mdo_contractor": opex_mdo_contractor
                },
                "government": {
                    "revenue_sharing": gov_revenue_sharing,
                    "adjusted_upfront": gov_adjusted_upfront,
                    "final_revenue_sharing": gov_final_rev_sharing,
                    "gst_revenue_sharing": gov_gst_rev_sharing,
                    "royalty": gov_royalty,
                    "dmf": gov_dmf,
                    "nmet": gov_nmet,
                    "surface_rent": gov_surface_rent,
                    "gst_royalty_etc": gov_gst_royalty_etc,
                    "mine_closure": gov_mine_closure,
                    "bank_fee": gov_bank_fee,
                    "total_fees": gov_total_fees,
                    "total_fees_with_mc_bank": gov_total_fees_with_mc_bank
                },
                "project_grand_total_opex": project_grand_total_opex,
                "production_schedule": {
                    "coal_production": clean_coal_prod,
                    "waste_volume": clean_waste_rem,
                    "topsoil_volume": clean_topsoil,
                    "waste_rehandling": clean_waste_rehandle,
                    "partings": computed_partings,
                    "ob_volume": computed_ob,
                    "chp_rehandling": computed_chp_reh,
                    "blasted_coal": computed_blasted,
                    "sm_coal": computed_sm_coal,
                    "stripping_ratio": computed_stripping_ratio,
                    "rehandling_cost": computed_rehandling_cost
                }
            }
        }
        
        computed_results_col.insert_one(result_doc)
        print(f"Scenario {scenario_key} computed and stored.")
        
    print("Calculation engine completed execution.")

if __name__ == "__main__":
    run_calculation()

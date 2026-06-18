import datetime
import os
import pymongo
import math
import numpy as np

# MongoDB connection configuration
CONNECTION_STRING = os.environ.get("MONGODB_URI", "mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem")
DATABASE_NAME = os.environ.get("DATABASE_NAME", "tem")

YEAR_HEADERS = [-4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]

def calculate_4_equip_costs(yearly_coal_prod, yearly_partings, machinery_mode, diesel_price=95.0):
    specs = {
        "drill": {"cost": 0.58, "life": 5, "spares": 0.10, "fuel_avg": 28.0, "hrs_yr": 4435.2, "tyres_nos": 0, "tyre_cost": 0.0, "lub_factor": 0.05},
        "shovel": {"cost": 4.35, "life": 6, "spares": 0.125, "fuel_avg": 48.0, "hrs_yr": 4752.0, "tyres_nos": 0, "tyre_cost": 0.0, "lub_factor": 0.05},
        "sm": {"cost": 7.67, "life": 5, "spares": 1.0/6.0, "fuel_avg": 90.0, "hrs_yr": 5385.6, "tyres_nos": 0, "tyre_cost": 0.0, "lub_factor": 0.05},
        "fel": {"cost": 4.52, "life": 5, "spares": 1.0/6.0, "fuel_avg": 55.0, "hrs_yr": 5722.2, "tyres_nos": 4, "tyre_cost": 150000.0 / 1e7, "lub_factor": 0.20}
    }
    
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

def calculate_explosives_115(yearly_coal_prod, machinery_mode):
    costs = {str(yr): 0.0 for yr in YEAR_HEADERS}
    for yr in YEAR_HEADERS:
        yr_str = str(yr)
        prod = yearly_coal_prod.get(yr_str, 0.0)
        if yr <= 0:
            blasted = 0.0
        elif yr <= 2:
            blasted = prod
        elif machinery_mode == "Surface Miner":
            blasted = prod * 0.15
        else:
            blasted = prod
            
        blasted_bcm = blasted / 1.72
        meters = blasted_bcm * 1e6 / 18.18181818181818
        blastholes = float(round(meters / 5.5, 0))
        
        boosters_kg = blastholes * 30.0 / 1000.0
        nonel_km = blastholes * 17.0 / 1000.0
        bulk_t = 0.1644087788401764 * blasted_bcm * 1e6 / 1000.0
        
        booster_cost = boosters_kg * 300.0 / 1e7
        nonel_cost = nonel_km * 25000.0 / 1e7
        bulk_cost = bulk_t * 52000.0 / 1e7
        
        costs[yr_str] = round(booster_cost + nonel_cost + bulk_cost, 6)
    return costs

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

# ─── Baseline Depreciation Data (from Depreciation-Owner sheet, L6="Yes" basis) ───
# These are the baseline yearly total depreciation values extracted from the Excel.
# They correspond to the Owner's total straight-line depreciation per year.
BASELINE_DEPR_YEARLY = {
    "-4": 14.6319733478, "-3": 32.0367316507, "-2": 66.5938347947, "-1": 97.2148069278,
    "1": 135.1487287506, "2": 144.5920710324, "3": 161.4528922169, "4": 207.496981372,
    "5": 223.8044081278, "6": 261.7286503476, "7": 264.3108138283, "8": 284.8338056824,
    "9": 299.1607208293, "10": 296.4517788107, "11": 296.7962380669, "12": 275.8988831247,
    "13": 270.8049986599, "14": 282.7877629392, "15": 269.7591803366, "16": 278.3518950153,
    "17": 261.8667600838, "18": 257.9921981816, "19": 250.9492973568,
}

# Baseline yearly CAPEX from Depreciation-Owner!Row35 (= Owner CAPEX excluding IDC)
BASELINE_CAPEX_DEP_YEARLY = {
    "-4": 155.994299, "-3": 343.4676494667, "-2": 677.7138993111, "-1": 542.1541493111,
    "1": 512.0366951786, "2": 185.813007191, "3": 214.0286328769, "4": 587.7657836193,
    "5": 327.9920244265, "6": 525.4418596552, "7": 328.5690080552, "8": 400.1813033937,
    "9": 352.3020144835, "10": 119.7748515037, "11": 142.2324651573, "12": 30.54268302,
    "13": 96.36632, "14": 269.36310022, "15": 56.7089213866, "16": 245.0386036055,
    "17": 32.3038003386, "18": 107.3549870055, "19": 180.57944,
}

# Salvage value (only in final year 19)
BASELINE_SALVAGE = {"19": 1499.060087}

# Coal purchase cost per year (from Coal Price!Row10)
COAL_PURCHASE_YEARLY = {
    "-4": 0.0, "-3": 0.0, "-2": 0.0, "-1": 0.0,
    "1": 59.5, "2": 159.5, "3": 330.0, "4": 286.0,
    "5": 462.0, "6": 242.0, "7": 330.0, "8": 286.0,
    "9": 308.0, "10": 220.0, "11": 176.0, "12": 396.0,
    "13": 180.0, "14": 190.0, "15": 0.0, "16": 0.0,
    "17": 0.0, "18": 0.0, "19": 0.0,
}

# ─── Financial Constants ───
CORPORATE_TAX_RATE = 0.2517       # Assumptions_Dashboard!D128
CSR_RATE = 0.02                    # Assumptions_Dashboard!D132
OWNER_DEBT_PCT = 0.30              # Assumptions_Dashboard!D144 when L6="No"
MDO_DEBT_PCT = 0.70                # Assumptions_Dashboard!D148 when L6="No"
INTEREST_RATE = 0.10               # Assumptions_Dashboard!D140
MORATORIUM_YEARS = 5               # Assumptions_Dashboard!D142
PAYBACK_YEARS = 7                  # Assumptions_Dashboard!D143
DISCOUNT_RATE = 0.10               # CF!E19


def calculate_borrowings(capex_initial_yearly, capex_sustaining_yearly, debt_pct, year_headers):
    """Calculate debt schedule, repayments, and interest costs.
    
    Follows Borrowings-Owner sheet logic:
    - Non-funded capex borrowing with moratorium and equal repayment
    - Interest = (Opening - Repayment) × rate + New × rate/2 + Repayment × rate/2
    
    Returns dict with yearly: total_interest, total_borrowings, total_repayments,
                              opening_balance, closing_balance
    """
    if debt_pct <= 0:
        zeros = {str(yr): 0.0 for yr in year_headers}
        return {
            "total_interest": dict(zeros), "total_borrowings": dict(zeros),
            "total_repayments": dict(zeros), "opening_balance": dict(zeros),
            "closing_balance": dict(zeros),
        }
    
    # Build yearly new debt schedule
    new_debt = {}
    for yr in year_headers:
        yr_str = str(yr)
        capex = capex_initial_yearly.get(yr_str, 0.0) + capex_sustaining_yearly.get(yr_str, 0.0)
        new_debt[yr_str] = max(capex * debt_pct, 0.0)
    
    # Build repayment schedule: each year's borrowing is repaid in PAYBACK_YEARS equal
    # installments starting after MORATORIUM_YEARS from the borrowing year.
    repayment_schedule = {str(yr): 0.0 for yr in year_headers}
    for borrow_yr in year_headers:
        borrow_yr_str = str(borrow_yr)
        borrowed = new_debt[borrow_yr_str]
        if borrowed <= 0:
            continue
        annual_repayment = borrowed / PAYBACK_YEARS
        # Find the index of borrow_yr in year_headers
        borrow_idx = year_headers.index(borrow_yr)
        # Repayments start MORATORIUM_YEARS after borrowing
        repay_start_idx = borrow_idx + MORATORIUM_YEARS + 1
        for r_offset in range(PAYBACK_YEARS):
            repay_idx = repay_start_idx + r_offset
            if repay_idx < len(year_headers):
                repay_yr_str = str(year_headers[repay_idx])
                repayment_schedule[repay_yr_str] += annual_repayment
    
    # Calculate interest and balances year by year
    opening = {str(yr): 0.0 for yr in year_headers}
    closing = {str(yr): 0.0 for yr in year_headers}
    interest = {str(yr): 0.0 for yr in year_headers}
    
    prev_closing = 0.0
    for yr in year_headers:
        yr_str = str(yr)
        op = prev_closing
        borrow = new_debt[yr_str]
        repay = min(repayment_schedule[yr_str], op + borrow)  # Can't repay more than balance
        
        # Interest: on (opening - repayment) + half-year on new borrowing + half-year on repayment
        int_cost = (op - repay) * INTEREST_RATE + borrow * INTEREST_RATE * 0.5 + repay * INTEREST_RATE * 0.5
        int_cost = max(int_cost, 0.0)
        
        cl = op + borrow - repay  # Interest is paid (not added to balance per Excel logic)
        
        opening[yr_str] = round(op, 6)
        closing[yr_str] = round(cl, 6)
        interest[yr_str] = round(int_cost, 6)
        prev_closing = cl
    
    return {
        "total_interest": interest,
        "total_borrowings": new_debt,
        "total_repayments": repayment_schedule,
        "opening_balance": opening,
        "closing_balance": closing,
    }


def calculate_pnl_tax_cf(year_headers, revenue_yearly, opex_yearly, coal_purchase_yearly,
                         capex_dep_yearly, depr_yearly, salvage_yearly,
                         interest_yearly, borrowings_yearly, repayments_yearly,
                         pre_tax_pre_finance):
    """Calculate P&L, Tax, and Cash Flow following the Excel formulas.
    
    Returns dict with pnl, tax, and cashflow sections.
    """
    is_pre_tax = (pre_tax_pre_finance == "Yes")
    
    # ── P&L Calculation ──
    pnl_realisation = {}
    pnl_operating_cost = {}
    pnl_coal_purchase = {}
    pnl_total_cost = {}
    pnl_ebidta = {}
    pnl_depreciation = {}
    pnl_salvage = {}
    pnl_ebit = {}
    pnl_interest = {}
    pnl_ebt = {}
    pnl_tax = {}
    pnl_pat = {}
    pnl_csr = {}
    pnl_pat_after_csr = {}
    
    # ── Tax Calculation ──
    tax_normal = {}
    
    # ── CF Calculation ──
    cf_project = {}
    cf_project_cumulative = {}
    cf_equity = {}
    cf_equity_cumulative = {}
    
    project_cf_series = []
    equity_cf_series = []
    
    prev_project_cum = 0.0
    prev_equity_cum = 0.0
    
    for yr in year_headers:
        yr_str = str(yr)
        
        rev = revenue_yearly.get(yr_str, 0.0)
        opex = opex_yearly.get(yr_str, 0.0)
        coal_pur = coal_purchase_yearly.get(yr_str, 0.0)
        depr = depr_yearly.get(yr_str, 0.0)
        salvage = salvage_yearly.get(yr_str, 0.0)
        interest_val = interest_yearly.get(yr_str, 0.0)
        borrow_val = borrowings_yearly.get(yr_str, 0.0)
        repay_val = repayments_yearly.get(yr_str, 0.0)
        capex_val = capex_dep_yearly.get(yr_str, 0.0)
        
        # P&L
        realisation = rev
        operating_cost_val = (opex + coal_pur)
        total_cost = operating_cost_val
        ebidta = realisation - total_cost
        ebit = ebidta - depr + salvage
        
        if is_pre_tax:
            interest_expense = 0.0
        else:
            interest_expense = interest_val
        
        ebt = ebit - interest_expense
        
        # Tax
        if is_pre_tax:
            normal_tax = 0.0
        else:
            normal_tax = max(0.0, ebt * CORPORATE_TAX_RATE)
        
        pat = ebt - normal_tax
        csr = max(0.0, pat * CSR_RATE) if pat > 0 else 0.0
        pat_after_csr_val = pat - csr
        
        pnl_realisation[yr_str] = round(realisation, 6)
        pnl_operating_cost[yr_str] = round(operating_cost_val, 6)
        pnl_coal_purchase[yr_str] = round(coal_pur, 6)
        pnl_total_cost[yr_str] = round(total_cost, 6)
        pnl_ebidta[yr_str] = round(ebidta, 6)
        pnl_depreciation[yr_str] = round(depr, 6)
        pnl_salvage[yr_str] = round(salvage, 6)
        pnl_ebit[yr_str] = round(ebit, 6)
        pnl_interest[yr_str] = round(interest_expense, 6)
        pnl_ebt[yr_str] = round(ebt, 6)
        pnl_tax[yr_str] = round(normal_tax, 6)
        pnl_pat[yr_str] = round(pat, 6)
        pnl_csr[yr_str] = round(csr, 6)
        pnl_pat_after_csr[yr_str] = round(pat_after_csr_val, 6)
        tax_normal[yr_str] = round(normal_tax, 6)
        
        # CF - Project
        cf_inflow = realisation
        cf_opex_out = -operating_cost_val
        cf_capex_out = -capex_val
        cf_tax_out = -normal_tax
        project_cashflow = cf_inflow + cf_opex_out + cf_capex_out + cf_tax_out
        
        prev_project_cum += project_cashflow
        cf_project[yr_str] = round(project_cashflow, 6)
        cf_project_cumulative[yr_str] = round(prev_project_cum, 6)
        project_cf_series.append(project_cashflow)
        
        # CF - Equity
        eq_inflow = realisation + borrow_val
        eq_opex_out = -operating_cost_val
        eq_capex_out = -capex_val
        eq_tax_out = -normal_tax
        eq_interest_out = -interest_expense
        eq_repay_out = -repay_val
        equity_cashflow = eq_inflow + eq_opex_out + eq_capex_out + eq_tax_out + eq_interest_out + eq_repay_out
        
        prev_equity_cum += equity_cashflow
        cf_equity[yr_str] = round(equity_cashflow, 6)
        cf_equity_cumulative[yr_str] = round(prev_equity_cum, 6)
        equity_cf_series.append(equity_cashflow)
    
    # IRR and NPV
    try:
        project_irr = float(np.irr(project_cf_series)) if hasattr(np, 'irr') else float(np.polynomial.polynomial.polyroots([1] + project_cf_series)[0])
    except Exception:
        project_irr = None
    
    try:
        equity_irr_val = float(np.irr(equity_cf_series)) if hasattr(np, 'irr') else None
    except Exception:
        equity_irr_val = None
    
    # Manual IRR calculation (since numpy.irr may not be available)
    def calc_irr(cashflows, guess=0.1, max_iter=1000, tol=1e-8):
        """Newton-Raphson IRR calculation."""
        rate = guess
        for _ in range(max_iter):
            npv = sum(cf / (1 + rate) ** t for t, cf in enumerate(cashflows))
            dnpv = sum(-t * cf / (1 + rate) ** (t + 1) for t, cf in enumerate(cashflows))
            if abs(dnpv) < 1e-14:
                break
            new_rate = rate - npv / dnpv
            if abs(new_rate - rate) < tol:
                return round(new_rate, 10)
            rate = new_rate
        return round(rate, 10)
    
    def calc_npv(rate, cashflows):
        """NPV calculation."""
        return sum(cf / (1 + rate) ** (t + 1) for t, cf in enumerate(cashflows))
    
    try:
        project_irr = calc_irr(project_cf_series)
    except Exception:
        project_irr = None
    
    try:
        equity_irr_val = calc_irr(equity_cf_series)
    except Exception:
        equity_irr_val = None
    
    project_npv = round(calc_npv(DISCOUNT_RATE, project_cf_series), 6)
    equity_npv = round(calc_npv(DISCOUNT_RATE, equity_cf_series), 6)
    
    # Payback period (years from start until cumulative CF > 0)
    payback_from_now = None
    for i, yr in enumerate(year_headers):
        yr_str = str(yr)
        if cf_project_cumulative[yr_str] >= 0 and i > 0:
            payback_from_now = i
            break
    
    # LOM totals
    lom_realisation = sum(pnl_realisation.values())
    lom_coal_prod = 225.70440651  # From production schedule
    
    return {
        "pnl": {
            "realisation": pnl_realisation,
            "operating_cost": pnl_operating_cost,
            "coal_purchase": pnl_coal_purchase,
            "total_cost": pnl_total_cost,
            "ebidta": pnl_ebidta,
            "depreciation": pnl_depreciation,
            "salvage": pnl_salvage,
            "ebit": pnl_ebit,
            "interest": pnl_interest,
            "ebt": pnl_ebt,
            "tax": pnl_tax,
            "pat": pnl_pat,
            "csr": pnl_csr,
            "pat_after_csr": pnl_pat_after_csr,
        },
        "tax": {
            "normal_tax": tax_normal,
            "tax_rate": CORPORATE_TAX_RATE,
        },
        "cashflow": {
            "project_cf": cf_project,
            "project_cumulative": cf_project_cumulative,
            "equity_cf": cf_equity,
            "equity_cumulative": cf_equity_cumulative,
            "project_irr": project_irr,
            "project_npv": project_npv,
            "equity_irr": equity_irr_val,
            "equity_npv": equity_npv,
            "payback_years": payback_from_now,
            "discount_rate": DISCOUNT_RATE,
        },
    }


def run_calculation():
    print("Connecting to MongoDB...")
    client = pymongo.MongoClient(CONNECTION_STRING)
    db = client[DATABASE_NAME]
    
    # Dynamically determine YEAR_HEADERS from production_schedule keys
    global YEAR_HEADERS
    try:
        sample_doc = db["production_schedule"].find_one({"item": "Production Coal/Ore"})
        if sample_doc and "yearly_values" in sample_doc:
            db_years = []
            for k in sample_doc["yearly_values"].keys():
                try:
                    db_years.append(int(k))
                except ValueError:
                    pass
            db_years.sort()
            if len(db_years) > 0:
                YEAR_HEADERS = db_years
                print(f"Dynamically loaded YEAR_HEADERS from MongoDB: {YEAR_HEADERS}")
    except Exception as e:
        print(f"Error dynamically loading YEAR_HEADERS, falling back to default: {e}")
        
    # 1. Load all schedules from MongoDB
    def load_schedule_dict(col_name):
        col = db[col_name]
        data = {}
        for doc in col.find():
            item = doc.get("item")
            data[item] = doc.get("yearly_values", {})
        return data

    def load_schedule_lom(col_name):
        col = db[col_name]
        data = {}
        for doc in col.find():
            item = doc.get("item")
            data[item] = doc.get("lom_total_or_average")
        return data

    print("Loading schedules from database...")
    production_sched = load_schedule_dict("production_schedule")
    production_sched_lom = load_schedule_lom("production_schedule")
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

    # Additional series loader
    avail_hours = production_sched.get("Total available Hours excavation", {})
    gcv_adb = production_sched.get("GCV (ADB)", {})
    rel_density = production_sched.get("Relaive Density (RD)", {})
    raw_ash = production_sched.get("Raw ash", {})
    moisture = production_sched.get("Moisture", {})
    haul_rom = production_sched.get("ROM", {})
    haul_waste = production_sched.get("Waste", {})
    haul_in_pit = production_sched.get("In-Pit", {})
    haul_ex_pit = production_sched.get("Ex-Pit", {})
    haul_rehandling = production_sched.get("Rehandling", {})
    bench_h_coal = production_sched.get("Bench Height - Coal", {})
    bench_w_coal = production_sched.get("Bench Width - Coal", {})
    bench_h_ob = production_sched.get("Bench Height - OB/IB", {})
    bench_w_ob = production_sched.get("Bench Width - OB/IB", {})

    clean_avail_hours = {}
    clean_gcv_adb = {}
    clean_rel_density = {}
    clean_raw_ash = {}
    clean_moisture = {}
    clean_haul_rom = {}
    clean_haul_waste = {}
    clean_haul_in_pit = {}
    clean_haul_ex_pit = {}
    clean_haul_rehandling = {}
    clean_bench_h_coal = {}
    clean_bench_w_coal = {}
    clean_bench_h_ob = {}
    clean_bench_w_ob = {}
    
    computed_cum_stripping_ratio = {}
    cum_waste = 0.0
    cum_coal = 0.0
    
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

        # Helper to get float or default from raw collections
        def get_clean_val(val_dict, key, default=0.0):
            val = val_dict.get(key)
            if val is None or val == "":
                return default
            try:
                return float(val)
            except ValueError:
                return val

        # Available Hours (Row 4)
        clean_avail_hours[yr_str] = get_clean_val(avail_hours, yr_str)
        # GCV (ADB) (Row 14)
        clean_gcv_adb[yr_str] = get_clean_val(gcv_adb, yr_str)
        # RD (Row 15)
        clean_rel_density[yr_str] = get_clean_val(rel_density, yr_str)
        # Raw ash (Row 16)
        clean_raw_ash[yr_str] = get_clean_val(raw_ash, yr_str)
        # Moisture (Row 17)
        clean_moisture[yr_str] = get_clean_val(moisture, yr_str)
        
        # Haul Distances (Row 23–27)
        clean_haul_rom[yr_str] = get_clean_val(haul_rom, yr_str)
        clean_haul_waste[yr_str] = get_clean_val(haul_waste, yr_str)
        clean_haul_in_pit[yr_str] = get_clean_val(haul_in_pit, yr_str)
        clean_haul_ex_pit[yr_str] = get_clean_val(haul_ex_pit, yr_str)
        clean_haul_rehandling[yr_str] = get_clean_val(haul_rehandling, yr_str)
        
        # Bench Specifications (Row 30–33)
        clean_bench_h_coal[yr_str] = get_clean_val(bench_h_coal, yr_str)
        clean_bench_w_coal[yr_str] = get_clean_val(bench_w_coal, yr_str)
        clean_bench_h_ob[yr_str] = get_clean_val(bench_h_ob, yr_str)
        clean_bench_w_ob[yr_str] = get_clean_val(bench_w_ob, yr_str)
        
        # Cumulative Stripping Ratio (Row 20)
        if yr <= 0:
            computed_cum_stripping_ratio[yr_str] = 0.0
        else:
            cum_waste += waste
            cum_coal += prod
            computed_cum_stripping_ratio[yr_str] = round(cum_waste / cum_coal, 6) if cum_coal > 0 else 0.0

    # LOM values from raw MongoDB collections
    def clean_lom(val, default=0.0):
        if val is None or val == "":
            return default
        try:
            return float(val)
        except ValueError:
            return val

    lom_avail_hours = clean_lom(production_sched_lom.get("Total available Hours excavation", 0.0))
    lom_coal_prod = clean_lom(production_sched_lom.get("Production Coal/Ore", 0.0))
    lom_blasted = sum(computed_blasted.values())
    lom_sm_coal = sum(computed_sm_coal.values())
    lom_waste_rem = clean_lom(production_sched_lom.get("Waste (Topsoil + Overburden + Interburden)", 0.0))
    lom_topsoil = clean_lom(production_sched_lom.get("Top Soil", 0.0))
    lom_ob = sum(computed_ob.values())
    lom_partings = sum(computed_partings.values())
    lom_chp_reh = sum(computed_chp_reh.values())
    lom_waste_rehandle = clean_lom(production_sched_lom.get("Waste - Rehandle", 0.0))
    lom_gcv_adb = clean_lom(production_sched_lom.get("GCV (ADB)", 0.0))
    lom_rel_density = clean_lom(production_sched_lom.get("Relaive Density (RD)", 0.0))
    lom_raw_ash = clean_lom(production_sched_lom.get("Raw ash", 0.0))
    lom_moisture = clean_lom(production_sched_lom.get("Moisture", 0.0))
    lom_stripping_ratio = lom_waste_rem / lom_coal_prod if lom_coal_prod > 0 else 0.0
    lom_cum_stripping_ratio = lom_waste_rem / lom_coal_prod if lom_coal_prod > 0 else 0.0
    lom_haul_rom = clean_lom(production_sched_lom.get("ROM", 0.0))
    lom_haul_waste = clean_lom(production_sched_lom.get("Waste", 0.0))
    lom_haul_in_pit = clean_lom(production_sched_lom.get("In-Pit", 0.0))
    lom_haul_ex_pit = clean_lom(production_sched_lom.get("Ex-Pit", 0.0))
    lom_haul_rehandling = clean_lom(production_sched_lom.get("Rehandling", 0.0))
    lom_bench_h_coal = clean_lom(production_sched_lom.get("Bench Height - Coal", 0.0))
    lom_bench_w_coal = clean_lom(production_sched_lom.get("Bench Width - Coal", 0.0))
    lom_bench_h_ob = clean_lom(production_sched_lom.get("Bench Height - OB/IB", 0.0))
    lom_bench_w_ob = clean_lom(production_sched_lom.get("Bench Width - OB/IB", 0.0))
    lom_rehandling_cost = sum(computed_rehandling_cost.values())
    
    print("  Derived schedules computed (Partings, OB, CHP Reh, Blasted/SM Coal, Stripping Ratio, Rehandling Cost, and extra Excel columns)")
    
    # 3. Perform calculation for all 16 combinations of switches
    # L4: Mining Mode -> "Departmental" or "MDO"
    # L6: Pre-Tax / Pre-Finance -> "Yes" or "No"
    # L8: Coal Price Type -> "Commercial" or "NCI"
    # Machinery Mode -> "Surface Miner" or "Shovel-Dumper"
    
    scenarios = [
        ("Departmental", "Yes", "Commercial", "Surface Miner"),
        ("Departmental", "Yes", "Commercial", "Shovel-Dumper"),
        ("Departmental", "Yes", "NCI", "Surface Miner"),
        ("Departmental", "Yes", "NCI", "Shovel-Dumper"),
        ("Departmental", "No", "Commercial", "Surface Miner"),
        ("Departmental", "No", "Commercial", "Shovel-Dumper"),
        ("Departmental", "No", "NCI", "Surface Miner"),
        ("Departmental", "No", "NCI", "Shovel-Dumper"),
        ("MDO", "Yes", "Commercial", "Surface Miner"),
        ("MDO", "Yes", "Commercial", "Shovel-Dumper"),
        ("MDO", "Yes", "NCI", "Surface Miner"),
        ("MDO", "Yes", "NCI", "Shovel-Dumper"),
        ("MDO", "No", "Commercial", "Surface Miner"),
        ("MDO", "No", "Commercial", "Shovel-Dumper"),
        ("MDO", "No", "NCI", "Surface Miner"),
        ("MDO", "No", "NCI", "Shovel-Dumper")
    ]
    
    computed_results_col = db["computed_results"]
    computed_results_col.delete_many({})
    
    # Precompute baseline Surface Miner costs once
    calc_sm = calculate_4_equip_costs(prod_coal, computed_partings, "Surface Miner", diesel_price=diesel_base_price if diesel_base_price > 0 else 95.0)
    calc_explosives_sm = calculate_explosives_115(prod_coal, "Surface Miner")
    
    for mining_mode, pre_tax_pre_finance, coal_price_type, machinery_type in scenarios:
        print(f"Calculating scenario: {mining_mode} | Pre-tax: {pre_tax_pre_finance} | Price: {coal_price_type} | Machinery: {machinery_type}...")
        
        machinery_key = machinery_type.replace("-", "").replace(" ", "")
        scenario_key = f"{mining_mode}_{pre_tax_pre_finance}_{coal_price_type}_{machinery_key}"
        
        # Calculate active costs
        calc_active = calculate_4_equip_costs(prod_coal, computed_partings, machinery_type, diesel_price=diesel_base_price if diesel_base_price > 0 else 95.0)
        calc_explosives_active = calculate_explosives_115(prod_coal, machinery_type)
        
        scenario_blasted_coal = {}
        scenario_sm_coal = {}
        
        # Scenario-specific HEMM capex tracking
        scenario_hemm_initial = {}
        scenario_hemm_sustaining = {}
        
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
            
            # Compute scenario-specific blasted/SM coal values
            # Blasted Coal (Row 6)
            if year <= 0:
                blasted = 0.0
            elif sm_threshold_year >= year:
                blasted = prod  # All coal is blasted before SM takes over
            elif machinery_type == "Surface Miner":
                blasted = prod * blasted_coal_fraction
            else:
                blasted = prod
            scenario_blasted_coal[yr_str] = round(blasted, 6)
            
            # Surface Miner Coal (Row 7)
            sm_coal_val = prod - blasted
            scenario_sm_coal[yr_str] = round(max(sm_coal_val, 0), 6)
            
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
            
            # Load baseline initial hemm and apply adjustment
            hemm_base_val = float(hemm_initial.get(yr_str, 0.0))
            adjusted_hemm = hemm_base_val - calc_sm["initial_capex"][yr_str] + calc_active["initial_capex"][yr_str]
            hemm_adjusted_val = max(adjusted_hemm, 0.0)
            
            # Store in scenario-specific capex tracking
            scenario_hemm_initial[yr_str] = round(hemm_adjusted_val, 6)
            
            # HEMM, Workshop, Dewatering depend on mode
            if mining_mode == "Departmental":
                hemm = hemm_adjusted_val
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
            
            # Load baseline replacement hemm and apply adjustment
            repl_base_val = float(hemm_sustaining.get(yr_str, 0.0))
            adjusted_repl = repl_base_val - calc_sm["sustaining_capex"][yr_str] + calc_active["sustaining_capex"][yr_str]
            repl_adjusted_val = max(adjusted_repl, 0.0)
            
            # Store in scenario-specific capex tracking
            scenario_hemm_sustaining[yr_str] = round(repl_adjusted_val, 6)
            
            # Owner Sustaining capex
            if mining_mode == "Departmental":
                mining_repl = repl_adjusted_val
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
                mdo_hemm = hemm_adjusted_val
                mdo_workshop = float(workshop_initial.get(yr_str, 0.0))
                mdo_dewatering = float(dewatering_initial.get(yr_str, 0.0))
                mdo_initial_cont = (mdo_hemm + mdo_workshop + mdo_dewatering) * 0.15
                mdo_initial_tot = mdo_hemm + mdo_workshop + mdo_dewatering + mdo_initial_cont
                
                mdo_mining_repl = repl_adjusted_val
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
                    diesel_val = max(diesel_val - calc_sm["diesel"][yr_str] + calc_active["diesel"][yr_str], 0.0)
                    
                    lub_val = float(owner_opex_sched.get("Lubrication", {}).get(yr_str, 0.0))
                    lub_val = max(lub_val - calc_sm["lubrication"][yr_str] + calc_active["lubrication"][yr_str], 0.0)
                    
                    spares_val = float(owner_opex_sched.get("HEMM Spares (including drill consumables)", {}).get(yr_str, 0.0))
                    spares_val = max(spares_val - calc_sm["spares"][yr_str] + calc_active["spares"][yr_str], 0.0)
                    
                    tyres_val = float(owner_opex_sched.get("Tyres", {}).get(yr_str, 0.0))
                    tyres_val = max(tyres_val - calc_sm["tyres"][yr_str] + calc_active["tyres"][yr_str], 0.0)
                    
                    explosives_val = float(owner_opex_sched.get("Explosives", {}).get(yr_str, 0.0))
                    explosives_val = max(explosives_val - calc_explosives_sm[yr_str] + calc_explosives_active[yr_str], 0.0)
                    
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

        # ============================================================
        # 5. FINANCIAL CALCULATIONS (Post year-loop)
        #    Borrowings, IDC, Revenue, Depreciation, P&L, Tax, CF
        # ============================================================
        print(f"  Computing financial model for {scenario_key}...")
        
        # --- 5a. Revenue Computation ---
        # Revenue depends on coal_price_type (Commercial vs NCI)
        revenue_yearly = {}
        for yr in YEAR_HEADERS:
            yr_str = str(yr)
            prod = float(prod_coal.get(yr_str, 0.0))
            nci_val = float(nci_price.get(yr_str, 0.0))
            comm_val = float(comm_price.get(yr_str, 0.0))
            
            if yr <= 0 or prod <= 0:
                revenue_yearly[yr_str] = 0.0
            else:
                # Revenue = NCI revenue + Commercial revenue from Government sheet
                # NCI price * prod / 10 or Comm price * prod / 10
                if coal_price_type == "NCI":
                    revenue_yearly[yr_str] = round(nci_val * prod / 10.0, 6) if nci_val > 0 else round(comm_val * prod / 10.0, 6)
                else:
                    # Commercial: use comm_price revenue directly
                    revenue_yearly[yr_str] = round(comm_val * prod / 10.0, 6) if comm_val > 0 else 0.0
        
        # --- 5b. Owner Borrowings & IDC ---
        # Debt % depends on pre_tax_pre_finance switch
        if pre_tax_pre_finance == "Yes":
            owner_debt_pct = 0.0
            mdo_debt_pct_val = 0.0
        else:
            owner_debt_pct = OWNER_DEBT_PCT
            mdo_debt_pct_val = MDO_DEBT_PCT
        
        # Use the capex values already computed for borrowing calculation
        # Borrowings are based on Depreciation-Owner!H23 (initial sub-total)
        # and Depreciation-Owner!H33 (sustaining sub-total)
        # These correspond to owner capex without IDC and without upfront
        owner_borrowings = calculate_borrowings(
            capex_initial_owner, capex_sustaining_owner,
            owner_debt_pct, YEAR_HEADERS
        )
        
        mdo_borrowings = calculate_borrowings(
            capex_initial_mdo, capex_sustaining_mdo,
            mdo_debt_pct_val, YEAR_HEADERS
        )
        
        # --- 5c. IDC (Interest During Construction) ---
        # IDC = Total Interest Cost from Borrowings-Owner per year
        # This adjusts the Owner CAPEX total
        idc_yearly = {}
        for yr in YEAR_HEADERS:
            yr_str = str(yr)
            idc_val = owner_borrowings["total_interest"][yr_str]
            idc_yearly[yr_str] = round(idc_val, 6)
            # Update Owner CAPEX with IDC
            capex_initial_owner[yr_str] = round(
                capex_initial_owner[yr_str] - 0.0 + idc_val, 6  # Replace hardcoded 0 with actual IDC
            )
            capex_total_owner[yr_str] = round(
                capex_initial_owner[yr_str] + capex_sustaining_owner[yr_str], 6
            )
            # Update project totals
            capex_initial_project[yr_str] = round(
                capex_initial_owner[yr_str] + capex_initial_mdo[yr_str], 6
            )
            capex_total_project[yr_str] = round(
                capex_total_owner[yr_str] + capex_total_mdo[yr_str], 6
            )
        
        # --- 5d. Depreciation & Salvage ---
        # Use baseline depreciation data (these don't change with pre-tax switch)
        depr_yearly_scenario = dict(BASELINE_DEPR_YEARLY)
        salvage_yearly_scenario = {}
        for yr in YEAR_HEADERS:
            yr_str = str(yr)
            salvage_yearly_scenario[yr_str] = BASELINE_SALVAGE.get(yr_str, 0.0)
        
        # Capex for CF (= Depreciation-Owner!H35 = total capex from depreciation sheet)
        # When L6="No", this includes IDC
        capex_for_cf = {}
        for yr in YEAR_HEADERS:
            yr_str = str(yr)
            base_capex = BASELINE_CAPEX_DEP_YEARLY.get(yr_str, 0.0)
            idc_adj = idc_yearly.get(yr_str, 0.0)
            capex_for_cf[yr_str] = round(base_capex + idc_adj, 6)
        
        # --- 5e. Operating Cost for P&L ---
        # P&L Operating Cost = Project OPEX Grand Total (Row 100)
        # This includes: MDO contractor + Owner mining costs + contingency + Govt fees + transportation
        # P&L!G15 = SUM(G17:G18) × (1+sensitivity)
        # G17 = 'Project OPEX'!E100 (Grand Total)
        # G18 = 'Coal Price'!E10 (Coal Purchase - handled separately in pnl func)
        opex_for_pnl = {}
        for yr in YEAR_HEADERS:
            yr_str = str(yr)
            opex_for_pnl[yr_str] = round(project_grand_total_opex.get(yr_str, 0.0), 6)
        
        # --- 5f. P&L, Tax, Cash Flow ---
        financial_results = calculate_pnl_tax_cf(
            year_headers=YEAR_HEADERS,
            revenue_yearly=revenue_yearly,
            opex_yearly=opex_for_pnl,
            coal_purchase_yearly=COAL_PURCHASE_YEARLY,
            capex_dep_yearly=capex_for_cf,
            depr_yearly=depr_yearly_scenario,
            salvage_yearly=salvage_yearly_scenario,
            interest_yearly=owner_borrowings["total_interest"],
            borrowings_yearly=owner_borrowings["total_borrowings"],
            repayments_yearly=owner_borrowings["total_repayments"],
            pre_tax_pre_finance=pre_tax_pre_finance,
        )
        
        print(f"    P&L EBIDTA LOM: {sum(financial_results['pnl']['ebidta'].values()):.2f} Cr")
        print(f"    Tax LOM: {sum(financial_results['tax']['normal_tax'].values()):.2f} Cr")
        print(f"    Interest LOM: {sum(financial_results['pnl']['interest'].values()):.2f} Cr")
        print(f"    Project IRR: {financial_results['cashflow']['project_irr']}")
        print(f"    Project NPV: {financial_results['cashflow']['project_npv']:.2f} Cr")
        
        # Store calculated results in dictionary format
        result_doc = {
            "projectId": "tem_project_1",
            "snapshotId": "initial_snapshot",
            "scenarioKey": scenario_key,
            "computedAt": datetime.datetime.utcnow(),
            "switches": {
                "mining_mode": mining_mode,
                "pre_tax_pre_finance": pre_tax_pre_finance,
                "coal_price_type": coal_price_type,
                "coal_mining_machinery": machinery_type
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
                    "project_total": capex_total_project,
                    "hemm_initial": scenario_hemm_initial,
                    "hemm_sustaining": scenario_hemm_sustaining,
                    "idc": idc_yearly
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
                "pnl": financial_results["pnl"],
                "tax": financial_results["tax"],
                "borrowings": {
                    "owner": {
                        "total_interest": owner_borrowings["total_interest"],
                        "total_borrowings": owner_borrowings["total_borrowings"],
                        "total_repayments": owner_borrowings["total_repayments"],
                        "debt_pct": owner_debt_pct,
                    },
                    "mdo": {
                        "total_interest": mdo_borrowings["total_interest"],
                        "total_borrowings": mdo_borrowings["total_borrowings"],
                        "total_repayments": mdo_borrowings["total_repayments"],
                        "debt_pct": mdo_debt_pct_val,
                    },
                },
                "cashflow": financial_results["cashflow"],
                "revenue": revenue_yearly,
                "production_schedule": {
                    "coal_production": clean_coal_prod,
                    "waste_volume": clean_waste_rem,
                    "topsoil_volume": clean_topsoil,
                    "waste_rehandling": clean_waste_rehandle,
                    "partings": computed_partings,
                    "ob_volume": computed_ob,
                    "chp_rehandling": computed_chp_reh,
                    "blasted_coal": scenario_blasted_coal,
                    "sm_coal": scenario_sm_coal,
                    "stripping_ratio": computed_stripping_ratio,
                    "rehandling_cost": computed_rehandling_cost,
                    
                    "available_hours": clean_avail_hours,
                    "gcv_adb": clean_gcv_adb,
                    "relative_density": clean_rel_density,
                    "raw_ash": clean_raw_ash,
                    "moisture": clean_moisture,
                    "cumulative_stripping_ratio": computed_cum_stripping_ratio,
                    "haul_rom": clean_haul_rom,
                    "haul_waste": clean_haul_waste,
                    "haul_in_pit": clean_haul_in_pit,
                    "haul_ex_pit": clean_haul_ex_pit,
                    "haul_rehandling": clean_haul_rehandling,
                    "bench_height_coal": clean_bench_h_coal,
                    "bench_width_coal": clean_bench_w_coal,
                    "bench_height_ob": clean_bench_h_ob,
                    "bench_width_ob": clean_bench_w_ob,
                },
                "production_schedule_lom": {
                    "coal_production": lom_coal_prod,
                    "waste_volume": lom_waste_rem,
                    "topsoil_volume": lom_topsoil,
                    "waste_rehandling": lom_waste_rehandle,
                    "partings": lom_partings,
                    "ob_volume": lom_ob,
                    "chp_rehandling": lom_chp_reh,
                    "blasted_coal": sum(scenario_blasted_coal.values()),
                    "sm_coal": sum(scenario_sm_coal.values()),
                    "stripping_ratio": lom_stripping_ratio,
                    "rehandling_cost": lom_rehandling_cost,
                    
                    "available_hours": lom_avail_hours,
                    "gcv_adb": lom_gcv_adb,
                    "relative_density": lom_rel_density,
                    "raw_ash": lom_raw_ash,
                    "moisture": lom_moisture,
                    "cumulative_stripping_ratio": lom_cum_stripping_ratio,
                    "haul_rom": lom_haul_rom,
                    "haul_waste": lom_haul_waste,
                    "haul_in_pit": lom_haul_in_pit,
                    "haul_ex_pit": lom_haul_ex_pit,
                    "haul_rehandling": lom_haul_rehandling,
                    "bench_height_coal": lom_bench_h_coal,
                    "bench_width_coal": lom_bench_w_coal,
                    "bench_height_ob": lom_bench_h_ob,
                    "bench_width_ob": lom_bench_w_ob,
                }
            }
        }
        
        computed_results_col.insert_one(result_doc)
        print(f"Scenario {scenario_key} computed and stored.")
        
    print("Calculation engine completed execution.")

if __name__ == "__main__":
    run_calculation()

import openpyxl

wb = openpyxl.load_workbook("Option 3_15 Mtpa_rev1_smg opt2 quality.xlsx", data_only=True)

def dump_sheet(sheet_name, max_rows=30):
    sheet = wb[sheet_name]
    print(f"\n================ {sheet_name} ================")
    for r in range(1, max_rows + 1):
        vals = [sheet.cell(r, c).value for c in range(1, 15)]
        while vals and vals[-1] is None:
            vals.pop()
        if vals:
            print(f"Row {r:02d}: {vals}")

dump_sheet("Owner CAPEX", 30)
dump_sheet("MDO CAPEX", 20)
dump_sheet("Project CAPEX", 20)

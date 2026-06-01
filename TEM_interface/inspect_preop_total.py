import openpyxl

wb = openpyxl.load_workbook("Option 3_15 Mtpa_rev1_smg opt2 quality.xlsx", data_only=True)
sheet = wb["Pre-Operative"]
print("Pre-Operative sheet bottom rows:")
for r in range(35, 45):
    vals = [sheet.cell(r, c).value for c in range(1, 15)]
    while vals and vals[-1] is None:
        vals.pop()
    if vals:
        print(f"Row {r:02d}: {vals}")

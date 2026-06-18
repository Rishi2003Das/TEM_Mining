import openpyxl

wb = openpyxl.load_workbook("/Users/rishidas/Documents/Internship_SRK/TEM_Mining/TEM_interface/IN1411_Radhikapur_Option 3_15 Mtpa_rev1_20260612.xlsx", data_only=True)
sheet = wb["Dashboard"]

for r in range(1, 80):
    row_cells = []
    for c in range(1, 10):
        val = sheet.cell(r, c).value
        row_cells.append(val)
    # Check if there is any non-None value in row_cells
    if any(x is not None for x in row_cells):
        print(f"Row {r:2d}: {[x for x in row_cells if x is not None]}")

import pymongo
import re

client = pymongo.MongoClient('mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem')
db = client['tem']
doc = db['computed_results'].find_one({'scenarioKey': 'Departmental_Yes_Commercial'}, {'_id': 0})
capex = doc['results']['capex']

owner_initial = sum(float(v) for v in capex['owner_initial'].values())
owner_sustaining = sum(float(v) for v in capex['owner_sustaining'].values())
print(f'Owner Initial: {owner_initial:.2f}')
print(f'Owner Sustaining: {owner_sustaining:.2f}')
print(f'Owner Total: {owner_initial + owner_sustaining:.2f}')

# Get pre-operative total
pre_op = db['pre_operative_schedule'].find_one({'item': 'Total'})
if pre_op:
    pre_op_total = sum(float(v) for v in pre_op['yearly_values'].values())
    print(f'Pre-Operative Total: {pre_op_total:.2f}')

# Get land cost total
land = db['land_schedule'].find_one({'item': re.compile('Land')})
if land:
    land_total = sum(float(v) for v in land['yearly_values'].values())
    print(f'Land ({land["item"]}): {land_total:.2f}')

# Get R&R total
rr = db['rr_schedule'].find_one({'item': re.compile('R.R')})
if rr:
    rr_total = sum(float(v) for v in rr['yearly_values'].values())
    print(f'R&R ({rr["item"]}): {rr_total:.2f}')

# Fleet
fleet = db['fleet_replacement_schedule'].find_one({'item': re.compile('Total Initial')})
if fleet:
    fleet_total = sum(float(v) for v in fleet['yearly_values'].values())
    print(f'HEMM Initial ({fleet["item"]}): {fleet_total:.2f}')

repl = db['fleet_replacement_schedule'].find_one({'item': re.compile('Replacement')})
if repl:
    repl_total = sum(float(v) for v in repl['yearly_values'].values())
    print(f'HEMM Replacement ({repl["item"]}): {repl_total:.2f}')

# Capex breakups
print("\nCapex Breakups:")
for item in db['capex_breakups_schedule'].find():
    total = sum(float(v) for v in item['yearly_values'].values() if isinstance(v, (int, float)))
    print(f'  {item["item"]}: {total:.2f}')

# Check collections list
print("\nAll Collections:")
for c in db.list_collection_names():
    print(f"  {c}")

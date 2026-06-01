import pymongo

CONNECTION_STRING = "mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem"
DATABASE_NAME = "tem"

def verify():
    client = pymongo.MongoClient(CONNECTION_STRING)
    db = client[DATABASE_NAME]
    
    gov_col = db["government_schedule"]
    
    print("--- Mine Closure Fund Values ---")
    doc_fund = gov_col.find_one({"item": "Mine Closure Fund"})
    if doc_fund:
        print("Mine Closure Fund:", doc_fund.get("yearly_values"))
    else:
        print("Mine Closure Fund not found")
        
    print("\n--- Mine Closure Fund Cost Values ---")
    doc_cost = gov_col.find_one({"item": "Mine Closure Fund Cost"})
    if doc_cost:
        print("Mine Closure Fund Cost:", doc_cost.get("yearly_values"))
    else:
        print("Mine Closure Fund Cost not found")

    print("\n--- Bank Fee / PBG Info ---")
    # Let's search for bank-fee related items in government_schedule or owner_opex_schedule
    for col_name in ["government_schedule", "owner_opex_schedule"]:
        print(f"\nSearching in {col_name}:")
        for doc in db[col_name].find():
            if "bank" in doc["item"].lower() or "fee" in doc["item"].lower() or "pbg" in doc["item"].lower():
                print(f"  Item: {doc['item']}, Year 1: {doc.get('yearly_values', {}).get('1')}, Total: {doc.get('lom_total_or_average')}")

if __name__ == "__main__":
    verify()

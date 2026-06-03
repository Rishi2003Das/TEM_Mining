import json
import os
import pymongo

# MongoDB connection configuration
CONNECTION_STRING = "mongodb+srv://rishikakalidas:KNris$0068@tem.khdmanp.mongodb.net/?appName=tem"
DATABASE_NAME = "tem"

# Mapping of JSON files to collection names
JSON_FILES_MAP = {
    "salary_wages.json": "salary_wages",
     "working_regime.json": "working_regime",
     "basic_consideration.json": "basic_consideration",
     "density_swell_factor.json": "density_swell_factor",
     "explosives.json": "explosives",
     "unit_rates_opcosts.json": "unit_rates_opcosts",
     "maintainance_cost.json": "maintainance_cost",
     "operational_para.json": "operational_para",
     "govt_fees_charges.json": "govt_fees_charges",
     "payment_assumption.json": "payment_assumption",
     "mdo_assumption.json": "mdo_assumption",
     "safety_slope_stability.json": "safety_slope_stability",
     "production_schedule_params.json": "production_schedule_params"
}

def import_json_to_mongodb():
    print("Connecting to MongoDB...")
    try:
        client = pymongo.MongoClient(CONNECTION_STRING)
        db = client[DATABASE_NAME]
        # Verify connection by pinging the database
        client.admin.command('ping')
        print("Successfully connected to MongoDB.")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return

    # Resolve paths relative to where this script is saved
    script_dir = os.path.dirname(os.path.abspath(__file__))

    for filename, collection_name in JSON_FILES_MAP.items():
        file_path = os.path.join(script_dir, "Hard_Input", filename)
        if not os.path.exists(file_path):
            print(f"Error: File {filename} not found in {script_dir}. Skipping.")
            continue

        print(f"\nProcessing {filename} -> Collection: '{collection_name}'...")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list):
                # If it is a single object, wrap it in a list
                data = [data]

            collection = db[collection_name]
            
            # Clear existing data in the collection to prevent duplicates
            delete_result = collection.delete_many({})
            print(f"Cleared {delete_result.deleted_count} existing records from '{collection_name}'.")

            # Insert new data
            if data:
                insert_result = collection.insert_many(data)
                print(f"Successfully inserted {len(insert_result.inserted_ids)} documents into '{collection_name}'.")
            else:
                print(f"File {filename} is empty. No documents to insert.")

        except Exception as e:
            print(f"Failed to import {filename}: {e}")

    print("\nData import process completed.")

if __name__ == "__main__":
    import_json_to_mongodb()
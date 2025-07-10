import sqlite3
from pathlib import Path

def init_spatialite():
    # Get the path to the database
    db_path = Path("airalert.db")
    
    # Connect to the database
    conn = sqlite3.connect(db_path)
    
    try:
        # Load the SpatiaLite extension
        conn.enable_load_extension(True)
        conn.load_extension("mod_spatialite")
        
        # Initialize spatial metadata
        conn.execute("SELECT InitSpatialMetaData(1);")
        
        # Commit the changes
        conn.commit()
        print("SpatiaLite initialized successfully!")
        
    except Exception as e:
        print(f"Error initializing SpatiaLite: {e}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    init_spatialite()

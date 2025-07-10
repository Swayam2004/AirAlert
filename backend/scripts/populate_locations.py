import sqlite3

def populate_locations():
    db_path = r"../../airalert.db"
    connection = sqlite3.connect(db_path)

    # Enable SpatiaLite extension
    connection.enable_load_extension(True)
    connection.execute("SELECT load_extension('mod_spatialite')")

    cursor = connection.cursor()

    # Example data: Replace with actual latitude and longitude values
    stations_data = [
        (1, 28.6139, 77.2090),  # Station 1: Delhi
        (2, 19.0760, 72.8777),  # Station 2: Mumbai
        (3, 13.0827, 80.2707),  # Station 3: Chennai
        (4, 22.5726, 88.3639),  # Station 4: Kolkata
        (5, 12.9716, 77.5946),  # Station 5: Bangalore
    ]

    for station_id, latitude, longitude in stations_data:
        point_wkt = f"POINT({longitude} {latitude})"
        cursor.execute(
            """
            UPDATE monitoring_stations
            SET location = ST_GeomFromText(?, 4326)
            WHERE id = ?
            """,
            (point_wkt, station_id),
        )

    connection.commit()
    connection.close()

if __name__ == "__main__":
    populate_locations()
    print("Location field populated successfully.")

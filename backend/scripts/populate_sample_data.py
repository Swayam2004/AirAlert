#!/usr/bin/env python
"""
Script to populate AirAlert database with sample air quality data.
This helps with testing and development by creating realistic data.
"""
import sqlite3
import random
from datetime import datetime, timedelta

def generate_sample_data():
    # Connect to the database
    db_path = "airalert.db"
    connection = sqlite3.connect(db_path)
    cursor = connection.cursor()
    
    print("Generating sample air quality data...")
    
    # Get current time
    now = datetime.now()
    
    # Generate data for the last 24 hours with readings every hour
    station_ids = [1, 2, 3, 4, 5]  # Delhi, Mumbai, Chennai, Kolkata, Bangalore
    
    # Data ranges based on typical AQI categories
    pollutant_ranges = {
        # Format: (min, max) values
        "pm25": (10, 80),  # PM2.5 in μg/m³
        "pm10": (20, 150),  # PM10 in μg/m³
        "o3": (20, 120),   # Ozone in ppb
        "no2": (10, 100),  # Nitrogen dioxide in ppb
        "so2": (5, 50),    # Sulfur dioxide in ppb
        "co": (0.5, 10),   # Carbon monoxide in ppm
    }
    
    # Weather data ranges
    weather_ranges = {
        "temperature": (18, 35),  # °C
        "humidity": (30, 90),     # %
        "wind_speed": (0, 15),    # m/s
        "wind_direction": (0, 359),  # degrees
        "pressure": (995, 1015),  # hPa
    }
    
    # Calculate AQI based on PM2.5 (simplified formula)
    def calculate_aqi(pm25):
        if pm25 <= 12:
            return (50/12) * pm25
        elif pm25 <= 35.4:
            return 50 + ((100-50)/(35.4-12)) * (pm25-12)
        elif pm25 <= 55.4:
            return 100 + ((150-100)/(55.4-35.4)) * (pm25-35.4)
        elif pm25 <= 150.4:
            return 150 + ((200-150)/(150.4-55.4)) * (pm25-55.4)
        elif pm25 <= 250.4:
            return 200 + ((300-200)/(250.4-150.4)) * (pm25-150.4)
        else:
            return 300 + ((500-300)/(500-250.4)) * (pm25-250.4)
    
    # Generate readings for each hour and station
    readings = []
    for station_id in station_ids:
        # Base values for this station
        base_values = {
            "pm25": random.uniform(pollutant_ranges["pm25"][0], pollutant_ranges["pm25"][1]),
            "pm10": random.uniform(pollutant_ranges["pm10"][0], pollutant_ranges["pm10"][1]),
            "o3": random.uniform(pollutant_ranges["o3"][0], pollutant_ranges["o3"][1]),
            "no2": random.uniform(pollutant_ranges["no2"][0], pollutant_ranges["no2"][1]),
            "so2": random.uniform(pollutant_ranges["so2"][0], pollutant_ranges["so2"][1]),
            "co": random.uniform(pollutant_ranges["co"][0], pollutant_ranges["co"][1]),
            "temperature": random.uniform(weather_ranges["temperature"][0], weather_ranges["temperature"][1]),
            "humidity": random.uniform(weather_ranges["humidity"][0], weather_ranges["humidity"][1]),
            "wind_speed": random.uniform(weather_ranges["wind_speed"][0], weather_ranges["wind_speed"][1]),
            "wind_direction": random.uniform(weather_ranges["wind_direction"][0], weather_ranges["wind_direction"][1]),
            "pressure": random.uniform(weather_ranges["pressure"][0], weather_ranges["pressure"][1]),
        }
        
        # Generate readings for the past 48 hours with some variation to create trends
        for hours_ago in range(48, 0, -1):
            timestamp = now - timedelta(hours=hours_ago)
            
            # Add some variation to base values
            pm25 = max(0, base_values["pm25"] + random.uniform(-5, 5))
            pm10 = max(0, base_values["pm10"] + random.uniform(-10, 10))
            o3 = max(0, base_values["o3"] + random.uniform(-5, 5))
            no2 = max(0, base_values["no2"] + random.uniform(-7, 7))
            so2 = max(0, base_values["so2"] + random.uniform(-3, 3))
            co = max(0, base_values["co"] + random.uniform(-0.5, 0.5))
            
            # Calculate AQI
            aqi = calculate_aqi(pm25)
            
            # Weather data
            temperature = base_values["temperature"] + random.uniform(-2, 2)
            humidity = max(0, min(100, base_values["humidity"] + random.uniform(-5, 5)))
            wind_speed = max(0, base_values["wind_speed"] + random.uniform(-2, 2))
            wind_direction = (base_values["wind_direction"] + random.uniform(-20, 20)) % 360
            pressure = base_values["pressure"] + random.uniform(-1, 1)
            
            # Add daily trends
            hour = timestamp.hour
            if 6 <= hour <= 9:  # Morning rush hour
                pm25 *= 1.2
                pm10 *= 1.2
                no2 *= 1.3
            elif 17 <= hour <= 20:  # Evening rush hour
                pm25 *= 1.25
                pm10 *= 1.25
                no2 *= 1.35
            elif 0 <= hour <= 4:  # Night time
                pm25 *= 0.8
                pm10 *= 0.8
                no2 *= 0.7
            
            reading = {
                "station_id": station_id,
                "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "pm25": round(pm25, 2),
                "pm10": round(pm10, 2),
                "o3": round(o3, 2),
                "no2": round(no2, 2),
                "so2": round(so2, 2),
                "co": round(co, 2),
                "aqi": round(aqi, 1),
                "temperature": round(temperature, 1),
                "humidity": round(humidity, 1),
                "wind_speed": round(wind_speed, 1),
                "wind_direction": round(wind_direction, 1),
                "pressure": round(pressure, 1),
            }
            
            readings.append(reading)
    
    # Insert readings into the database
    print(f"Inserting {len(readings)} readings into the database...")
    for reading in readings:
        cursor.execute("""
            INSERT INTO pollutant_readings (
                station_id, timestamp, pm25, pm10, o3, no2, so2, co, aqi,
                temperature, humidity, wind_speed, wind_direction, pressure
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            reading["station_id"], reading["timestamp"], 
            reading["pm25"], reading["pm10"], reading["o3"], reading["no2"], reading["so2"], reading["co"], reading["aqi"],
            reading["temperature"], reading["humidity"], reading["wind_speed"], reading["wind_direction"], reading["pressure"]
        ))
    
    # Commit and close
    connection.commit()
    connection.close()
    
    print(f"Successfully added {len(readings)} sample readings to the database.")

if __name__ == "__main__":
    generate_sample_data()

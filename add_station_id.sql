ALTER TABLE weather_data ADD COLUMN station_id INTEGER REFERENCES monitoring_stations(id);

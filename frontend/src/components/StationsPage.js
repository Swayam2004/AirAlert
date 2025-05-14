import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, LayerGroup } from "react-leaflet";
import axios from "axios";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

const StationsPage = () => {
	const [stations, setStations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedStation, setSelectedStation] = useState(null);
	const [activeFilter, setActiveFilter] = useState("all");
	const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Default center (India)

	// Define marker icons based on status
	const stationIcon = (status) => {
		const colors = {
			active: "#2ecc71", // Green
			maintenance: "#f39c12", // Yellow
			offline: "#e74c3c", // Red
			unknown: "#95a5a6", // Gray
		};

		return new Icon({
			iconUrl: `data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${
				colors[status] || colors.unknown
			}" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
			iconSize: [32, 32],
			iconAnchor: [16, 32],
			popupAnchor: [0, -32],
		});
	};

	// AQI color mapping
	const getAqiColor = (aqi) => {
		if (aqi <= 50) return "#2ecc71"; // Good - Green
		if (aqi <= 100) return "#f1c40f"; // Moderate - Yellow
		if (aqi <= 150) return "#e67e22"; // Unhealthy for Sensitive Groups - Orange
		if (aqi <= 200) return "#e74c3c"; // Unhealthy - Red
		if (aqi <= 300) return "#9b59b6"; // Very Unhealthy - Purple
		return "#800000"; // Hazardous - Maroon
	};

	// AQI label mapping
	const getAqiLabel = (aqi) => {
		if (aqi <= 50) return "Good";
		if (aqi <= 100) return "Moderate";
		if (aqi <= 150) return "Unhealthy for Sensitive Groups";
		if (aqi <= 200) return "Unhealthy";
		if (aqi <= 300) return "Very Unhealthy";
		return "Hazardous";
	};

	useEffect(() => {
		const fetchStations = async () => {
			try {
				setLoading(true);
				// Simulated data - in production, replace with real API call
				// const response = await axios.get('/api/stations');
				const simulatedData = [
					{
						id: 1,
						name: "Delhi Central",
						lat: 28.6139,
						lng: 77.209,
						status: "active",
						aqi: 165,
						pollutants: {
							pm25: 85.2,
							pm10: 142.6,
							o3: 48.7,
							no2: 56.3,
							so2: 22.1,
							co: 1.2,
						},
						lastUpdated: new Date().toISOString(),
					},
					{
						id: 2,
						name: "Mumbai Coastal",
						lat: 19.076,
						lng: 72.8777,
						status: "active",
						aqi: 92,
						pollutants: {
							pm25: 42.1,
							pm10: 86.4,
							o3: 38.2,
							no2: 31.5,
							so2: 15.8,
							co: 0.8,
						},
						lastUpdated: new Date().toISOString(),
					},
					{
						id: 3,
						name: "Bangalore Tech Hub",
						lat: 12.9716,
						lng: 77.5946,
						status: "maintenance",
						aqi: 68,
						pollutants: {
							pm25: 28.4,
							pm10: 62.7,
							o3: 31.9,
							no2: 24.8,
							so2: 11.3,
							co: 0.6,
						},
						lastUpdated: new Date().toISOString(),
					},
					{
						id: 4,
						name: "Kolkata Eastern",
						lat: 22.5726,
						lng: 88.3639,
						status: "active",
						aqi: 115,
						pollutants: {
							pm25: 56.8,
							pm10: 102.4,
							o3: 42.3,
							no2: 38.9,
							so2: 18.2,
							co: 0.9,
						},
						lastUpdated: new Date().toISOString(),
					},
					{
						id: 5,
						name: "Chennai Coastal",
						lat: 13.0827,
						lng: 80.2707,
						status: "offline",
						aqi: null,
						pollutants: null,
						lastUpdated: "2025-05-10T08:30:00Z",
					},
				];

				setStations(simulatedData);
				setLoading(false);
			} catch (err) {
				setError(err.message);
				setLoading(false);
			}
		};

		fetchStations();
	}, []);

	// Filter stations based on active filter
	const filteredStations = activeFilter === "all" ? stations : stations.filter((station) => station.status === activeFilter);

	// Handle station selection
	const handleStationSelect = (station) => {
		setSelectedStation(station);
		setMapCenter([station.lat, station.lng]);
	};

	return (
		<div className="stations-page container">
			<header className="page-header">
				<h1>Monitoring Stations</h1>
				<p className="text-muted">Real-time air quality data from monitoring stations across the country</p>
			</header>

			{loading ? (
				<div className="loading-spinner">Loading stations...</div>
			) : error ? (
				<div className="error-message">Error loading stations: {error}</div>
			) : (
				<div className="stations-content">
					<div className="filters-section">
						<h2>Station Filters</h2>
						<div className="filter-buttons">
							<button className={`filter-btn ${activeFilter === "all" ? "active" : ""}`} onClick={() => setActiveFilter("all")}>
								All Stations
							</button>
							<button className={`filter-btn ${activeFilter === "active" ? "active" : ""}`} onClick={() => setActiveFilter("active")}>
								Active Stations
							</button>
							<button className={`filter-btn ${activeFilter === "maintenance" ? "active" : ""}`} onClick={() => setActiveFilter("maintenance")}>
								Under Maintenance
							</button>
							<button className={`filter-btn ${activeFilter === "offline" ? "active" : ""}`} onClick={() => setActiveFilter("offline")}>
								Offline Stations
							</button>
						</div>
					</div>

					<div className="map-and-list">
						<div className="stations-list">
							<h2>Available Stations</h2>
							<div className="station-cards">
								{filteredStations.map((station) => (
									<div key={station.id} className={`station-card ${selectedStation && selectedStation.id === station.id ? "selected" : ""}`} onClick={() => handleStationSelect(station)}>
										<div className="station-header">
											<h3>{station.name}</h3>
											<span className={`status-badge status-${station.status}`}>{station.status.charAt(0).toUpperCase() + station.status.slice(1)}</span>
										</div>

										{station.aqi !== null ? (
											<div className="station-aqi">
												<div className="aqi-value" style={{ backgroundColor: getAqiColor(station.aqi) }}>
													{station.aqi}
												</div>
												<div className="aqi-label">{getAqiLabel(station.aqi)}</div>
											</div>
										) : (
											<div className="no-data">No data available</div>
										)}
									</div>
								))}
							</div>
						</div>

						<div className="stations-map">
							<MapContainer center={mapCenter} zoom={5} style={{ height: "600px", width: "100%" }}>
								<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

								<LayersControl position="topright">
									<LayersControl.BaseLayer checked name="Street Map">
										<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
									</LayersControl.BaseLayer>
									<LayersControl.BaseLayer name="Satellite">
										<TileLayer url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" subdomains={["mt0", "mt1", "mt2", "mt3"]} />
									</LayersControl.BaseLayer>

									<LayersControl.Overlay checked name="Monitoring Stations">
										<LayerGroup>
											{filteredStations.map((station) => (
												<Marker key={station.id} position={[station.lat, station.lng]} icon={stationIcon(station.status)}>
													<Popup>
														<div className="station-popup">
															<h3>{station.name}</h3>
															<div className={`status-badge status-${station.status}`}>{station.status.charAt(0).toUpperCase() + station.status.slice(1)}</div>

															{station.aqi !== null ? (
																<>
																	<div className="popup-aqi">
																		<strong>AQI:</strong>
																		<span style={{ color: getAqiColor(station.aqi) }}>
																			{station.aqi} ({getAqiLabel(station.aqi)})
																		</span>
																	</div>

																	<div className="popup-pollutants">
																		<strong>Pollutants:</strong>
																		<ul>
																			<li>PM2.5: {station.pollutants.pm25} µg/m³</li>
																			<li>PM10: {station.pollutants.pm10} µg/m³</li>
																			<li>Ozone: {station.pollutants.o3} ppb</li>
																			<li>NO₂: {station.pollutants.no2} ppb</li>
																		</ul>
																	</div>

																	<div className="popup-updated">Last updated: {new Date(station.lastUpdated).toLocaleString()}</div>
																</>
															) : (
																<div className="no-data">No data available</div>
															)}

															<button className="btn-details">View Full Details</button>
														</div>
													</Popup>

													{station.aqi && (
														<Circle
															center={[station.lat, station.lng]}
															pathOptions={{
																fillColor: getAqiColor(station.aqi),
																color: getAqiColor(station.aqi),
																fillOpacity: 0.3,
															}}
															radius={10000} // 10km radius
														/>
													)}
												</Marker>
											))}
										</LayerGroup>
									</LayersControl.Overlay>
								</LayersControl>
							</MapContainer>
						</div>
					</div>

					{selectedStation && (
						<div className="station-details">
							<h2>Station Details: {selectedStation.name}</h2>

							{selectedStation.aqi !== null ? (
								<div className="details-content">
									<div className="details-section">
										<h3>Current Air Quality</h3>
										<div className="detail-cards">
											<div className="detail-card">
												<h4>AQI</h4>
												<div className="large-value" style={{ color: getAqiColor(selectedStation.aqi) }}>
													{selectedStation.aqi}
												</div>
												<div className="label">{getAqiLabel(selectedStation.aqi)}</div>
											</div>

											<div className="detail-card">
												<h4>PM2.5</h4>
												<div className="large-value">{selectedStation.pollutants.pm25}</div>
												<div className="label">µg/m³</div>
											</div>

											<div className="detail-card">
												<h4>PM10</h4>
												<div className="large-value">{selectedStation.pollutants.pm10}</div>
												<div className="label">µg/m³</div>
											</div>

											<div className="detail-card">
												<h4>Ozone</h4>
												<div className="large-value">{selectedStation.pollutants.o3}</div>
												<div className="label">ppb</div>
											</div>
										</div>
									</div>

									<div className="details-actions">
										<button className="btn-primary">View Historical Data</button>
										<button className="btn-secondary">Set Up Alerts</button>
										<button className="btn-secondary">Download Data</button>
									</div>
								</div>
							) : (
								<div className="no-data-message">
									This station is currently offline. No air quality data is available.
									<div className="last-seen">Last seen online: {new Date(selectedStation.lastUpdated).toLocaleString()}</div>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default StationsPage;

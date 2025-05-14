import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { interpolateRgb } from "d3-interpolate";

/**
 * PollutionHeatmap component for visualizing spatial distribution of pollution
 *
 * Features:
 * - Heat map visualization of pollution concentration
 * - Color gradient based on pollution severity
 * - Toggleable layers for different pollutants
 * - Markers for monitoring stations
 * - Popups with detailed pollution information
 */
const PollutionHeatmap = ({
	data,
	stations,
	selectedPollutant = "pm25",
	center = [20.5937, 78.9629], // Default center (India)
	zoom = 5,
	height = "600px",
	showStations = true,
}) => {
	const mapRef = useRef(null);
	const heatLayerRef = useRef(null);
	const [threshold, setThreshold] = useState(null);

	// Pollutant-specific settings
	const pollutantSettings = {
		pm25: {
			thresholds: [0, 12, 35.5, 55.5, 150.5, 250.5],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			label: "PM2.5 (μg/m³)",
			radius: 0.8,
		},
		pm10: {
			thresholds: [0, 55, 155, 255, 355, 425],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			label: "PM10 (μg/m³)",
			radius: 0.8,
		},
		o3: {
			thresholds: [0, 54, 70, 85, 105, 200],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			label: "O3 (ppb)",
			radius: 1,
		},
		no2: {
			thresholds: [0, 53, 100, 360, 649, 1249],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			label: "NO2 (ppb)",
			radius: 1,
		},
		so2: {
			thresholds: [0, 35, 75, 185, 304, 604],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			label: "SO2 (ppb)",
			radius: 1,
		},
		co: {
			thresholds: [0, 4.4, 9.4, 12.4, 15.4, 30.4],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			label: "CO (ppm)",
			radius: 1,
		},
		aqi: {
			thresholds: [0, 50, 100, 150, 200, 300],
			colors: ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"],
			label: "AQI",
			radius: 0.5,
		},
	};

	// Get the severity level based on the value and thresholds
	const getSeverityLevel = (value) => {
		const thresholds = pollutantSettings[selectedPollutant]?.thresholds || [0, 50, 100, 150, 200, 300];

		for (let i = 0; i < thresholds.length - 1; i++) {
			if (value < thresholds[i + 1]) {
				return i;
			}
		}
		return thresholds.length - 1;
	};

	// Get the color based on value
	const getColor = (value) => {
		if (value === null || value === undefined) {
			return "#aaaaaa"; // Gray for no data
		}

		const settings = pollutantSettings[selectedPollutant];
		const { thresholds, colors } = settings;

		// Find the appropriate threshold range
		for (let i = 0; i < thresholds.length - 1; i++) {
			if (value < thresholds[i + 1]) {
				if (i === thresholds.length - 2) {
					return colors[i + 1]; // Max color
				}

				// Calculate the proportion between the thresholds
				const proportion = (value - thresholds[i]) / (thresholds[i + 1] - thresholds[i]);

				// Interpolate between colors
				return interpolateRgb(colors[i], colors[i + 1])(proportion);
			}
		}

		return colors[colors.length - 1]; // Highest severity color
	};

	// Get the radius based on pollution value
	const getRadius = (value) => {
		if (value === null || value === undefined) return 5;

		// Base radius
		const base = pollutantSettings[selectedPollutant]?.radius || 0.8;

		// Scale radius based on severity
		const severityLevel = getSeverityLevel(value);
		return 5 + severityLevel * 1.2; // Radius increases with severity
	};

	// Get descriptive text for severity level
	const getSeverityText = (value) => {
		const severityLevel = getSeverityLevel(value);
		const labels = ["Good", "Moderate", "Unhealthy for Sensitive Groups", "Unhealthy", "Very Unhealthy", "Hazardous"];
		return labels[severityLevel] || "Unknown";
	};

	// Prepare data for the heatmap
	useEffect(() => {
		if (!mapRef.current || !data || data.length === 0) return;

		// Remove existing heatmap layer if it exists
		if (heatLayerRef.current) {
			mapRef.current.removeLayer(heatLayerRef.current);
		}

		// Prepare heat map points [lat, lng, intensity]
		const heatPoints = data
			.filter((point) => point[selectedPollutant] !== undefined && point[selectedPollutant] !== null)
			.map((point) => {
				// Get value for this pollutant
				const value = point[selectedPollutant];

				// Get normalized intensity (0-1) based on thresholds
				const thresholds = pollutantSettings[selectedPollutant]?.thresholds || [0, 50, 100, 150, 200, 300];
				const maxThreshold = thresholds[thresholds.length - 1];
				const intensity = Math.min(value / maxThreshold, 1) * 0.8 + 0.2; // Scale to 0.2-1 range

				return [point.latitude, point.longitude, intensity];
			});

		// Create the heatmap layer
		if (heatPoints.length > 0) {
			// Get the color gradient function
			const colors = pollutantSettings[selectedPollutant]?.colors || ["#00e400", "#ffff00", "#ff7e00", "#ff0000", "#8f3f97", "#7e0023"];

			heatLayerRef.current = L.heatLayer(heatPoints, {
				radius: 25,
				blur: 15,
				maxZoom: 10,
				gradient: {
					0.2: colors[0],
					0.4: colors[1],
					0.6: colors[2],
					0.7: colors[3],
					0.8: colors[4],
					1.0: colors[5],
				},
			}).addTo(mapRef.current);

			// Set threshold based on the selected pollutant
			setThreshold(pollutantSettings[selectedPollutant]?.thresholds || [0, 50, 100, 150, 200, 300]);
		}

		// Fit bounds to data points if available
		if (data.length > 0 && mapRef.current) {
			const bounds = L.latLngBounds(data.filter((point) => point.latitude && point.longitude).map((point) => [point.latitude, point.longitude]));

			if (bounds.isValid()) {
				mapRef.current.fitBounds(bounds, { padding: [50, 50] });
			}
		}

		return () => {
			// Cleanup heatmap layer on unmount or when pollutant changes
			if (heatLayerRef.current && mapRef.current) {
				mapRef.current.removeLayer(heatLayerRef.current);
			}
		};
	}, [data, selectedPollutant, mapRef.current]);

	return (
		<div className="pollution-heatmap">
			<MapContainer
				center={center}
				zoom={zoom}
				style={{ height, width: "100%" }}
				whenCreated={(mapInstance) => {
					mapRef.current = mapInstance;
				}}
			>
				<TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

				{/* Add station markers if enabled */}
				{showStations &&
					stations &&
					stations.map((station, idx) => {
						// Get the pollution value for this station
						const stationData = data.find((d) => d.station_id === station.id);
						const value = stationData ? stationData[selectedPollutant] : null;
						const color = getColor(value);
						const radius = getRadius(value);

						return (
							<CircleMarker
								key={`station-${station.id || idx}`}
								center={[station.latitude, station.longitude]}
								radius={radius}
								pathOptions={{
									color: "white",
									fillColor: color,
									fillOpacity: 0.8,
									weight: 2,
								}}
							>
								<Tooltip>
									<div>
										<strong>{station.station_name || `Station #${station.id}`}</strong>
										<br />
										{value !== null && value !== undefined ? (
											<>
												{pollutantSettings[selectedPollutant].label}: <strong>{value.toFixed(2)}</strong>
												<br />
												Status: <span style={{ color }}>{getSeverityText(value)}</span>
											</>
										) : (
											"No data available"
										)}
									</div>
								</Tooltip>
								<Popup>
									<div>
										<h3>{station.station_name || `Station #${station.id}`}</h3>
										<p>
											Location: {station.city || "Unknown"}, {station.state || "Unknown"}
											<br />
											Coordinates: {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
										</p>
										{stationData ? (
											<div>
												<strong>Measurements:</strong>
												<ul style={{ paddingLeft: "20px", margin: "5px 0" }}>
													{Object.entries(pollutantSettings).map(([key, settings]) => {
														const val = stationData[key];
														if (val === null || val === undefined) return null;

														return (
															<li key={key}>
																{settings.label}: <strong>{val.toFixed(2)}</strong>
																<span
																	style={{
																		color: getColor(val),
																		marginLeft: "5px",
																		fontWeight: "bold",
																	}}
																>
																	({getSeverityText(val)})
																</span>
															</li>
														);
													})}
												</ul>
												<div>
													<small>Last Updated: {new Date(stationData.timestamp).toLocaleString()}</small>
												</div>
											</div>
										) : (
											<p>No pollution data available for this station</p>
										)}
									</div>
								</Popup>
							</CircleMarker>
						);
					})}

				{/* Add legend */}
				<div
					className="info legend"
					style={{
						position: "absolute",
						bottom: "30px",
						right: "10px",
						backgroundColor: "white",
						padding: "10px",
						borderRadius: "5px",
						boxShadow: "0 0 15px rgba(0,0,0,0.2)",
						zIndex: 1000,
					}}
				>
					<div>
						<strong>{pollutantSettings[selectedPollutant].label} Legend</strong>
					</div>
					{threshold &&
						threshold.map((t, i) => {
							const nextThreshold = threshold[i + 1] || "∞";
							if (i === threshold.length - 1) return null;

							return (
								<div key={i} style={{ display: "flex", alignItems: "center", margin: "3px 0" }}>
									<div
										style={{
											width: "20px",
											height: "20px",
											backgroundColor: pollutantSettings[selectedPollutant].colors[i],
											marginRight: "5px",
										}}
									></div>
									<span>{i === 0 ? `< ${nextThreshold}` : `${t} - ${nextThreshold}`}</span>
								</div>
							);
						})}
				</div>
			</MapContainer>
		</div>
	);
};

export default PollutionHeatmap;

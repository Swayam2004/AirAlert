import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import API from "../services/api";

function MonitoringStations() {
	const [stations, setStations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchStations = async () => {
			try {
				setLoading(true);
				const response = await API.getMonitoringStations();
				setStations(response.data.stations);
				setError(null);
			} catch (err) {
				console.error("Error fetching monitoring stations:", err);
				setError("Failed to load monitoring stations. Please try again later.");
			} finally {
				setLoading(false);
			}
		};

		fetchStations();
	}, []);

	if (loading) return <div className="loading">Loading stations...</div>;
	if (error) return <div className="error-message">{error}</div>;

	return (
		<section className="monitoring-stations">
			<h2>Monitoring Stations</h2>
			{stations.length === 0 ? (
				<p>No monitoring stations available.</p>
			) : (
				<div className="stations-container">
					<MapContainer center={[20.5937, 78.9629]} zoom={4} style={{ height: "500px", width: "100%" }}>
						<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors" />

						{stations.map((station) => (
							<Marker key={station.id} position={[station.latitude, station.longitude]}>
								<Popup>
									<div>
										<h3>{station.name}</h3>
										<p>ID: {station.id}</p>
										<p>Location: {station.location}</p>
										{station.last_reading && (
											<div className="last-reading">
												<p>
													<strong>Last Reading:</strong>
												</p>
												<p>Time: {new Date(station.last_reading.timestamp).toLocaleString()}</p>
												<p>AQI: {station.last_reading.aqi}</p>
											</div>
										)}
									</div>
								</Popup>
							</Marker>
						))}
					</MapContainer>

					<div className="stations-list">
						<h3>All Stations</h3>
						<ul>
							{stations.map((station) => (
								<li key={station.id}>
									{station.name} - {station.location}
								</li>
							))}
						</ul>
					</div>
				</div>
			)}
		</section>
	);
}

export default MonitoringStations;

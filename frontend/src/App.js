import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./App.css";

function PollutantTrends() {
	const [data, setData] = useState([]);

	useEffect(() => {
		// Fetch pollutant data from the backend
		axios
			.get("/api/air_quality?pollutant=pm25")
			.then((response) => {
				const formattedData = response.data.readings.map((reading) => ({
					timestamp: reading.timestamp,
					value: reading.pm25,
				}));
				setData(formattedData);
			})
			.catch((error) => console.error("Error fetching data:", error));
	}, []);

	return (
		<section>
			<h2>Pollutant Trends</h2>
			<LineChart width={600} height={300} data={data}>
				<Line type="monotone" dataKey="value" stroke="#8884d8" />
				<CartesianGrid stroke="#ccc" />
				<XAxis dataKey="timestamp" />
				<YAxis />
				<Tooltip />
			</LineChart>
		</section>
	);
}

function AlertVisualization() {
	const [alerts, setAlerts] = useState([]);

	useEffect(() => {
		// Fetch active alerts from the backend
		axios
			.get("/api/alerts?active_only=true")
			.then((response) => {
				setAlerts(response.data.alerts);
			})
			.catch((error) => console.error("Error fetching alerts:", error));
	}, []);

	return (
		<section>
			<h2>Active Alerts</h2>
			<MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: "500px", width: "100%" }}>
				<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors" />
				{alerts.map((alert) => (
					<Circle key={alert.id} center={[alert.latitude, alert.longitude]} radius={alert.severity_level * 1000} color={alert.severity_level > 3 ? "red" : "orange"}>
						<Popup>
							<strong>{alert.alert_type}</strong>
							<br />
							Pollutant: {alert.pollutant}
							<br />
							Severity: {alert.severity_level}
							<br />
							Current Value: {alert.current_value}
							<br />
							Threshold: {alert.threshold_value}
						</Popup>
					</Circle>
				))}
			</MapContainer>
		</section>
	);
}

function UserPreferences() {
	const [preferences, setPreferences] = useState({
		location: "",
		sensitivity: 3,
		notifications: {
			email: true,
			sms: false,
			web: true,
		},
	});

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setPreferences((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleCheckboxChange = (e) => {
		const { name, checked } = e.target;
		setPreferences((prev) => ({
			...prev,
			notifications: {
				...prev.notifications,
				[name]: checked,
			},
		}));
	};

	const savePreferences = () => {
		// Save preferences to the backend
		axios
			.post("/api/user/preferences", preferences)
			.then(() => alert("Preferences saved successfully!"))
			.catch((error) => console.error("Error saving preferences:", error));
	};

	return (
		<section>
			<h2>User Preferences</h2>
			<form onSubmit={(e) => e.preventDefault()}>
				<label>
					Location:
					<input type="text" name="location" value={preferences.location} onChange={handleInputChange} />
				</label>
				<br />
				<label>
					Sensitivity Level:
					<input type="range" name="sensitivity" min="1" max="5" value={preferences.sensitivity} onChange={handleInputChange} />
				</label>
				<br />
				<fieldset>
					<legend>Notification Preferences:</legend>
					<label>
						<input type="checkbox" name="email" checked={preferences.notifications.email} onChange={handleCheckboxChange} />
						Email
					</label>
					<br />
					<label>
						<input type="checkbox" name="sms" checked={preferences.notifications.sms} onChange={handleCheckboxChange} />
						SMS
					</label>
					<br />
					<label>
						<input type="checkbox" name="web" checked={preferences.notifications.web} onChange={handleCheckboxChange} />
						Web
					</label>
				</fieldset>
				<br />
				<button type="button" onClick={savePreferences}>
					Save Preferences
				</button>
			</form>
		</section>
	);
}

function App() {
	return (
		<div className="App">
			<header className="App-header">
				<h1>AirAlert Dashboard</h1>
			</header>
			<main>
				<section>
					<h2>Interactive Map</h2>
					<MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: "500px", width: "100%" }}>
						<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors" />
						<Marker position={[51.505, -0.09]}>
							<Popup>A sample marker.</Popup>
						</Marker>
					</MapContainer>
				</section>
				<PollutantTrends />
				<AlertVisualization />
				<UserPreferences />
			</main>
		</div>
	);
}

export default App;

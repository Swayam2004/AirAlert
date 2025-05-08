import React, { useState, useEffect } from "react";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Import components
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import PollutantTrends from "./components/PollutantTrends";
import AlertVisualization from "./components/AlertVisualization";
import MonitoringStations from "./components/MonitoringStations";
import UserProfile from "./components/UserProfile";
import APIStatus from "./components/APIStatus";

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || ""; // Use environment variable or default to current host
axios.defaults.headers.common["Content-Type"] = "application/json";

// Add authorization header to all requests if token exists
axios.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

function App() {
	const [activeSection, setActiveSection] = useState("dashboard");
	const [isHealthy, setIsHealthy] = useState(true);

	// Check API health on startup
	useEffect(() => {
		const checkHealth = async () => {
			try {
				await axios.get("/health");
				setIsHealthy(true);
			} catch (error) {
				console.error("API health check failed:", error);
				setIsHealthy(false);
			}
		};

		checkHealth();
		// Periodically check health
		const intervalId = setInterval(checkHealth, 60000); // Check every minute

		return () => clearInterval(intervalId);
	}, []);

	// Render different components based on active section
	const renderActiveSection = () => {
		switch (activeSection) {
			case "dashboard":
				return <Dashboard />;
			case "trends":
				return <PollutantTrends />;
			case "alerts":
				return <AlertVisualization />;
			case "stations":
				return <MonitoringStations />;
			case "profile":
				return <UserProfile />;
			default:
				return <Dashboard />;
		}
	};

	return (
		<div className="App">
			<header className="App-header">
				<div className="header-content">
					<div className="logo-container">
						<h1>AirAlert</h1>
						<span className="tagline">Real-time Air Quality Monitoring</span>
					</div>

					{!isHealthy && <div className="api-status-warning">⚠️ API connection issues. Some features may not work correctly.</div>}
				</div>
			</header>

			<Navigation activeSection={activeSection} setActiveSection={setActiveSection} />

			<main className="App-main">{renderActiveSection()}</main>

			<footer className="App-footer">
				<div className="footer-content">
					<p>© {new Date().getFullYear()} AirAlert System</p>
					<div className="footer-links">
						<a href="#about">About</a>
						<a href="#help">Help</a>
						<a href="#privacy">Privacy Policy</a>
					</div>
				</div>
			</footer>

			{/* API Status Panel (Floating) */}
			<APIStatus />
		</div>
	);
}

export default App;

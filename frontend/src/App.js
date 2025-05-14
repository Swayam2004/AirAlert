import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./styles/designSystem.css";
import "./App.css";

// Import components
import Dashboard from "./components/Dashboard";
import PollutantTrends from "./components/PollutantTrends";
import AlertVisualization from "./components/AlertVisualization";
import MonitoringStations from "./components/MonitoringStations";
import UserProfile from "./components/UserProfile";
import APIStatus from "./components/APIStatus";
import NotificationCenter from "./components/NotificationCenter";
import UserSettings from "./components/UserSettings";
import DataExplorer from "./components/DataExplorer";
import Login from "./components/Login";
import AuthService from "./services/auth";

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

// Navigation component with active state
const Navigation = () => {
	const location = useLocation();
	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

	return (
		<nav className="main-nav">
			<div className="nav-container">
				<div className="nav-brand">
					<Link to="/" className="brand-link">
						<span className="brand-icon">🌬️</span>
						<span className="brand-name">AirAlert</span>
					</Link>
				</div>

				<button className="mobile-menu-toggle" onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} aria-label="Toggle navigation">
					{isMobileNavOpen ? "✕" : "☰"}
				</button>

				<div className={`nav-links ${isMobileNavOpen ? "nav-open" : ""}`}>
					<Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""}`} onClick={() => setIsMobileNavOpen(false)}>
						Dashboard
					</Link>
					<Link to="/stations" className={`nav-link ${location.pathname.includes("/stations") ? "active" : ""}`} onClick={() => setIsMobileNavOpen(false)}>
						Monitoring Stations
					</Link>
					<Link to="/data-explorer" className={`nav-link ${location.pathname.includes("/data-explorer") ? "active" : ""}`} onClick={() => setIsMobileNavOpen(false)}>
						Data Explorer
					</Link>
				</div>
			</div>
		</nav>
	);
};

// Footer component
const Footer = () => (
	<footer className="app-footer">
		<div className="footer-container">
			<div className="footer-brand">
				<span className="brand-icon">🌬️</span>
				<h3>AirAlert</h3>
				<p className="footer-tagline">Real-time air quality monitoring and alerts</p>
			</div>

			<div className="footer-links">
				<div className="footer-links-section">
					<h4>Navigation</h4>
					<ul>
						<li>
							<Link to="/">Dashboard</Link>
						</li>
						<li>
							<Link to="/stations">Monitoring Stations</Link>
						</li>
						<li>
							<Link to="/data-explorer">Data Explorer</Link>
						</li>
					</ul>
				</div>

				<div className="footer-links-section">
					<h4>Resources</h4>
					<ul>
						<li>
							<a href="#">Documentation</a>
						</li>
						<li>
							<a href="#">API Reference</a>
						</li>
						<li>
							<a href="#">Privacy Policy</a>
						</li>
					</ul>
				</div>

				<div className="footer-links-section">
					<h4>Contact</h4>
					<ul>
						<li>
							<a href="mailto:support@airalert.example.com">support@airalert.example.com</a>
						</li>
					</ul>
				</div>
			</div>
		</div>
		<div className="footer-bottom">
			<p>&copy; {new Date().getFullYear()} AirAlert. All rights reserved.</p>
		</div>
	</footer>
);

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [isHealthy, setIsHealthy] = useState(true);

	useEffect(() => {
		// Check authentication status when the app loads
		const checkAuth = async () => {
			try {
				setLoading(true);
				const userData = await AuthService.getCurrentUser();
				if (userData) {
					setIsAuthenticated(true);
					setUser(userData);
				}
			} catch (err) {
				console.error("Error checking authentication:", err);
				setIsAuthenticated(false);
				setUser(null);
			} finally {
				setLoading(false);
			}
		};

		checkAuth();
	}, []);

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

	const handleLogin = (userData) => {
		setIsAuthenticated(true);
		setUser(userData);
	};

	const handleLogout = async () => {
		try {
			await AuthService.logout();
			setIsAuthenticated(false);
			setUser(null);
		} catch (err) {
			console.error("Error logging out:", err);
		}
	};

	const openSettingsModal = () => {
		setShowSettingsModal(true);
	};

	if (loading) {
		return (
			<div className="loading-container">
				<div className="loading">Loading AirAlert...</div>
			</div>
		);
	}

	return (
		<Router>
			<div className="app">
				<header className="app-header">
					<Navigation />

					<div className="header-actions">
						{isAuthenticated ? (
							<>
								<NotificationCenter userId={user?.id} onSettingsClick={openSettingsModal} />

								<div className="user-profile">
									<div className="user-avatar" onClick={openSettingsModal}>
										{user?.name?.charAt(0) || "U"}
									</div>
									<div className="user-dropdown">
										<div className="user-info">
											<p className="user-name">{user?.name}</p>
											<p className="user-email">{user?.email}</p>
										</div>
										<div className="dropdown-divider"></div>
										<button className="user-settings-btn" onClick={openSettingsModal}>
											Settings
										</button>
										<button className="user-logout-btn" onClick={handleLogout}>
											Logout
										</button>
									</div>
								</div>
							</>
						) : (
							<Link to="/login" className="login-button">
								Log In
							</Link>
						)}
					</div>
				</header>

				<main className="app-main">
					<Routes>
						<Route path="/" element={<Dashboard />} />
						<Route path="/stations" element={<MonitoringStations />} />
						<Route path="/data-explorer" element={<DataExplorer />} />
						<Route path="/login" element={<Login onLoginSuccess={handleLogin} isAuthenticated={isAuthenticated} />} />
					</Routes>
				</main>

				<Footer />

				{showSettingsModal && isAuthenticated && <UserSettings user={user} onClose={() => setShowSettingsModal(false)} />}

				{!isHealthy && <div className="api-status-warning">⚠️ API connection issues. Some features may not work correctly.</div>}
			</div>
		</Router>
	);
}

export default App;

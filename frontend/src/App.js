import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./styles/designSystem.css";
import "./App.css";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import HeaderActions from "./components/HeaderActions";

// Import only used components
import HomePage from "./components/HomePage";
import HowToOperate from "./components/HowToOperate";
import Dashboard from "./components/DashboardNew";
import ProfilesPage from "./components/ProfilesPage";
import AlertsPage from "./components/AlertsPage";
import AdminPanel from "./components/AdminPanel";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import AboutUsPage from "./components/AboutUsPage";
import ContactUsPage from "./components/ContactUsPage";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import StationsPage from "./components/StationsPage";
import AdvancedMonitoringDashboard from "./components/AdvancedMonitoringDashboard";
import DataExplorerPage from "./components/DataExplorerPage";
import DocumentationPage from "./components/DocumentationPage";
import ApiReferencePage from "./components/ApiReferencePage";
import AuthService from "./services/auth";
import NotificationCenter from "./components/NotificationCenter";

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"; // Use environment variable or explicitly set the backend URL
axios.defaults.headers.common["Content-Type"] = "application/json";
axios.defaults.timeout = 10000; // Add a timeout to avoid hanging requests

// Add authorization header and error handling to all requests
axios.interceptors.request.use((config) => {
	const token = localStorage.getItem("accessToken");
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// Add response interceptor for better error handling
axios.interceptors.response.use(
	(response) => response,
	(error) => {
		// Handle CORS errors more gracefully
		if (error.message === "Network Error") {
			console.warn("Network error detected. This might be due to CORS or API server being offline.");
		}
		return Promise.reject(error);
	}
);

// Navigation component with active state
const Navigation = () => {
	const location = useLocation();
	const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
	const { hasRole } = useContext(AuthContext);

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
					<Link to="/dashboard" className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""}`} onClick={() => setIsMobileNavOpen(false)}>
						Dashboard
					</Link>
					{/* <Link to="/stations" className={`nav-link ${location.pathname.includes("/stations") ? "active" : ""}`} onClick={() => setIsMobileNavOpen(false)}>
						Monitoring Stations
					</Link> */}
					<Link to="/advanced-monitoring" className={`nav-link ${location.pathname.includes("/advanced-monitoring") ? "active" : ""}`} onClick={() => setIsMobileNavOpen(false)}>
						Advanced Monitoring
					</Link>
					<Link to="/data-explorer" className={`nav-link ${location.pathname.includes("/data-explorer") ? "active" : ""}`} onClick={() => setIsMobileNavOpen(false)}>
						Data Explorer
					</Link>
					{/* Admin Panel Link - Only visible to admin and superuser roles */}
					{hasRole("admin") && (
						<Link to="/admin" className={`nav-link ${location.pathname.includes("/admin") ? "active" : ""}`} onClick={() => setIsMobileNavOpen(false)}>
							Admin Panel
						</Link>
					)}
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
							<Link to="/dashboard">Dashboard</Link>
						</li>
						{/* <li>
							<Link to="/stations">Monitoring Stations</Link>
						</li> */}
						<li>
							<Link to="/advanced-monitoring">Advanced Monitoring</Link>
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
							<a href="/documentation">Documentation</a>
						</li>
						<li>
							<a href="/api-reference">API Reference</a>
						</li>
						<li>
							<a href="/privacy-policy">Privacy Policy</a>
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
	const [showSettingsModal, setShowSettingsModal] = useState(false);
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

	const openSettingsModal = () => {
		setShowSettingsModal(true);
	};

	return (
		<Router>
			<AuthProvider>
				<ThemeProvider>
					<div className="app">
						<header className="app-header">
							<Navigation />

							<HeaderActions openSettingsModal={openSettingsModal} showSettingsModal={showSettingsModal} setShowSettingsModal={setShowSettingsModal} />
						</header>

						<main className="app-main">
							<Routes>
								<Route path="/" element={<HomePage />} />
								<Route path="/how-to-operate" element={<HowToOperate />} />
								<Route path="/dashboard" element={<Dashboard />} />
								<Route path="/profile" element={<ProfilesPage />} />
								<Route path="/alerts" element={<AlertsPage />} />
								<Route path="/admin" element={<AdminPanel />} />
								<Route path="/login" element={<LoginPage />} />
								<Route path="/register" element={<RegisterPage />} />
								<Route path="/about-us" element={<AboutUsPage />} />
								<Route path="/contact-us" element={<ContactUsPage />} />
								<Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
								<Route path="/stations" element={<StationsPage />} />
								<Route path="/advanced-monitoring" element={<AdvancedMonitoringDashboard />} />
								<Route path="/data-explorer" element={<DataExplorerPage />} />
								<Route path="/documentation" element={<DocumentationPage />} />
								<Route path="/api-reference" element={<ApiReferencePage />} />
							</Routes>
						</main>

						<Footer />

						{!isHealthy && <div className="api-status-warning">⚠️ API connection issues. Some features may not work correctly.</div>}
					</div>
				</ThemeProvider>
			</AuthProvider>
		</Router>
	);
}

export default App;

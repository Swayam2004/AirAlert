import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import AdminUserManagement from "./admin/AdminUserManagement";
import AdminBroadcast from "./admin/AdminBroadcast";
import "../styles/index.css";
import "./admin/AdminPanel.css";

function AdminPanel() {
	const { hasRole } = useContext(AuthContext);
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState("dashboard");

	// Redirect non-admin users
	useEffect(() => {
		if (!hasRole("admin")) {
			navigate("/dashboard");
		}
	}, [hasRole, navigate]);

	// Function to render the active component based on tab
	const renderActiveComponent = () => {
		switch (activeTab) {
			case "users":
				return <AdminUserManagement />;
			case "broadcast":
				return <AdminBroadcast />;
			case "dashboard":
			default:
				return renderDashboard();
		}
	};

	// Admin dashboard with overview statistics
	const renderDashboard = () => {
		return (
			<div className="admin-dashboard">
				<div className="admin-stats-grid">
					<div className="admin-stat-card">
						<h3>User Statistics</h3>
						<div className="stat-value">--</div>
						<div className="stat-description">Total users in the system</div>
						<button className="btn btn-primary stat-action" onClick={() => setActiveTab("users")}>
							Manage Users
						</button>
					</div>

					<div className="admin-stat-card">
						<h3>Recent Broadcasts</h3>
						<div className="stat-value">--</div>
						<div className="stat-description">Broadcasts sent in the last 7 days</div>
						<button className="btn btn-primary stat-action" onClick={() => setActiveTab("broadcast")}>
							Create Broadcast
						</button>
					</div>

					<div className="admin-stat-card">
						<h3>Monitoring Stations</h3>
						<div className="stat-value">--</div>
						<div className="stat-description">Active monitoring stations</div>
						<button className="btn btn-primary stat-action" onClick={() => navigate("/stations")}>
							View Stations
						</button>
					</div>

					<div className="admin-stat-card">
						<h3>API Health</h3>
						<div className="stat-value">OK</div>
						<div className="stat-description">System is operational</div>
						<button className="btn btn-primary stat-action" onClick={() => window.open("/api/docs", "_blank")}>
							API Documentation
						</button>
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="admin-panel-container">
			<div className="admin-sidebar">
				<h2 className="admin-sidebar-title">Admin Panel</h2>
				<nav className="admin-navigation">
					<button className={`admin-nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => setActiveTab("dashboard")}>
						Dashboard
					</button>
					<button className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
						User Management
					</button>
					<button className={`admin-nav-item ${activeTab === "broadcast" ? "active" : ""}`} onClick={() => setActiveTab("broadcast")}>
						Broadcast Alerts
					</button>
					<button className={`admin-nav-item ${activeTab === "stations" ? "active" : ""}`} onClick={() => navigate("/stations")}>
						Monitoring Stations
					</button>
					{hasRole("superuser") && (
						<button className={`admin-nav-item ${activeTab === "system" ? "active" : ""}`} onClick={() => setActiveTab("system")}>
							System Configuration
						</button>
					)}
				</nav>
			</div>

			<div className="admin-content">{renderActiveComponent()}</div>
		</div>
	);
}

export default AdminPanel;

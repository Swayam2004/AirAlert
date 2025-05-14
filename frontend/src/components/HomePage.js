import React from "react";
import "../styles/index.css";
import Dashboard from "./DashboardNew"; // Import the enhanced Dashboard component

function HomePage() {
	return (
		<div className="container">
			<header className="home-header mb-5">
				<h1 className="text-primary">AirAlert Dashboard</h1>
				<p className="text-secondary">Monitor air quality in real-time and stay informed with alerts.</p>
			</header>

			{/* Render the enhanced Dashboard component */}
			<Dashboard />
		</div>
	);
}

export default HomePage;

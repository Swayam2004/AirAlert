import React from "react";
import "../styles/index.css";

function HomePage() {
	return (
		<div className="container text-center">
			<header className="mb-5">
				<h1 className="text-primary">Welcome to AirAlert</h1>
				<p className="text-secondary">Monitor air quality in real-time and stay informed with alerts.</p>
				<button className="btn btn-primary mt-3">Explore Features</button>
			</header>

			<section className="stats-container">
				<div className="stat-card">
					<div className="stat-icon aqi-good">🌿</div>
					<div className="stat-content">
						<h3>Current AQI</h3>
						<div className="stat-value">
							42 <span className="stat-unit">Good</span>
						</div>
					</div>
				</div>

				<div className="stat-card">
					<div className="stat-icon aqi-moderate">🌤️</div>
					<div className="stat-content">
						<h3>Key Location</h3>
						<div className="stat-value">
							78 <span className="stat-unit">Moderate</span>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}

export default HomePage;

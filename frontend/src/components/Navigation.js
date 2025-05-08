import React from "react";

function Navigation({ activeSection, setActiveSection }) {
	const sections = [
		{ id: "dashboard", label: "Dashboard" },
		{ id: "trends", label: "Pollutant Trends" },
		{ id: "alerts", label: "Alerts" },
		{ id: "stations", label: "Monitoring Stations" },
		{ id: "profile", label: "User Profile" },
	];

	return (
		<nav className="main-navigation">
			<ul>
				{sections.map((section) => (
					<li key={section.id}>
						<button className={activeSection === section.id ? "active" : ""} onClick={() => setActiveSection(section.id)}>
							{section.label}
						</button>
					</li>
				))}
			</ul>
		</nav>
	);
}

export default Navigation;

import React from "react";
import { Link } from "react-router-dom";
import "../styles/index.css";

function StatCard({ title, value, unit, description, icon, trend, trendValue, link }) {
	const getTrendClass = () => {
		if (!trend) return "";
		return trend === "up" ? "trend-up" : trend === "down" ? "trend-down" : "trend-neutral";
	};

	const renderContent = () => (
		<>
			<div className="stat-header">
				{icon && <span className="stat-icon">{icon}</span>}
				<h3 className="stat-title">{title}</h3>
			</div>
			<div className="stat-value">
				{value}
				{unit && <span className="stat-unit">{unit}</span>}
			</div>
			{trend && trendValue && (
				<div className={`stat-trend ${getTrendClass()}`}>
					<span className="trend-arrow">{trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}</span>
					<span className="trend-value">{trendValue}</span>
				</div>
			)}
			{description && <p className="stat-description">{description}</p>}
		</>
	);

	if (link) {
		return (
			<Link to={link} className="stat-card">
				{renderContent()}
			</Link>
		);
	}

	return <div className="stat-card">{renderContent()}</div>;
}

export default StatCard;

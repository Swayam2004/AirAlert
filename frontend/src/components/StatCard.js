import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
	faChartLine,
	faArrowUp,
	faArrowDown,
	faBroadcastTower,
	faInfoCircle, // Default fallback icon
} from "@fortawesome/free-solid-svg-icons";
import "../styles/index.css";

function StatCard({ title, value, unit, description, icon, trend, trendValue, link, color = "#3498db" }) {
	const getTrendClass = () => {
		if (!trend) return "";
		return trend === "up" ? "trend-up" : trend === "down" ? "trend-down" : "trend-neutral";
	};

	const renderContent = () => (
		<>
			<div className="stat-header">
				{icon && (
					<span className="stat-icon">
						<FontAwesomeIcon
							icon={
								icon === "chart-line" ? faChartLine : icon === "arrow-up" ? faArrowUp : icon === "arrow-down" ? faArrowDown : icon === "broadcast-tower" ? faBroadcastTower : faInfoCircle // default fallback icon
							}
							color={color}
						/>
					</span>
				)}
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

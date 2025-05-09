import React, { useState } from "react";
import API from "../services/api";

function APIStatus() {
	const [endpoints, setEndpoints] = useState([
		{ name: "Health Check", endpoint: "/health", status: "pending", time: null },
		{ name: "Monitoring Stations", endpoint: "/api/monitoring_stations", status: "pending", time: null },
		{ name: "Air Quality", endpoint: "/api/air_quality", status: "pending", time: null },
		{ name: "Alerts", endpoint: "/api/alerts", status: "pending", time: null },
	]);

	const [isOpen, setIsOpen] = useState(false);

	const testEndpoint = async (endpoint, index) => {
		try {
			setEndpoints((prev) => {
				const updated = [...prev];
				updated[index] = { ...updated[index], status: "testing" };
				return updated;
			});

			const startTime = Date.now();
			await API.healthCheck(); // Use the first endpoint for testing
			const endTime = Date.now();

			setEndpoints((prev) => {
				const updated = [...prev];
				updated[index] = {
					...updated[index],
					status: "success",
					time: `${endTime - startTime}ms`,
				};
				return updated;
			});
		} catch (error) {
			setEndpoints((prev) => {
				const updated = [...prev];
				updated[index] = {
					...updated[index],
					status: "failed",
					time: null,
					error: error.message,
				};
				return updated;
			});
		}
	};

	const testAll = () => {
		endpoints.forEach((endpoint, index) => {
			testEndpoint(endpoint.endpoint, index);
		});
	};

	const getStatusIcon = (status) => {
		switch (status) {
			case "success":
				return "✅";
			case "failed":
				return "❌";
			case "testing":
				return "⏳";
			default:
				return "⚪";
		}
	};

	return (
		<div className="api-status-panel">
			{!isOpen ? (
				<button className="api-status-toggle" onClick={() => setIsOpen(true)}>
					Show API Status
				</button>
			) : (
				<div className="api-status-content">
					<div className="api-status-header">
						<h3>API Status</h3>
						<button className="api-status-close" onClick={() => setIsOpen(false)}>
							Close
						</button>
					</div>

					<div className="api-endpoints">
						<div className="endpoints-list">
							{endpoints.map((endpoint, index) => (
								<div key={index} className={`endpoint-item status-${endpoint.status}`}>
									<div className="endpoint-info">
										<span className="endpoint-icon">{getStatusIcon(endpoint.status)}</span>
										<span className="endpoint-name">{endpoint.name}</span>
										<span className="endpoint-url">{endpoint.endpoint}</span>
										{endpoint.time && <span className="endpoint-time">{endpoint.time}</span>}
									</div>
									<button onClick={() => testEndpoint(endpoint.endpoint, index)} disabled={endpoint.status === "testing"}>
										Test
									</button>
								</div>
							))}
						</div>

						<div className="endpoint-actions">
							<button onClick={testAll}>Test All Endpoints</button>
							<button
								onClick={() => {
									setEndpoints(endpoints.map((e) => ({ ...e, status: "pending", time: null })));
								}}
							>
								Reset
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default APIStatus;

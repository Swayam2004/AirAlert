import React, { useState } from "react";
import "./ApiReferencePage.css";

const ApiReferencePage = () => {
	const [activeEndpoint, setActiveEndpoint] = useState("auth");
	const [copied, setCopied] = useState("");

	const handleSetEndpoint = (endpoint) => {
		setActiveEndpoint(endpoint);
		// Smooth scrolling to section
		document.getElementById(endpoint).scrollIntoView({ behavior: "smooth" });
	};

	const handleCopyCode = (code, id) => {
		navigator.clipboard.writeText(code);
		setCopied(id);
		setTimeout(() => setCopied(""), 2000);
	};

	return (
		<div className="api-reference-container">
			<div className="api-sidebar">
				<h3>API Reference</h3>
				<ul>
					<li className={activeEndpoint === "auth" ? "active" : ""}>
						<button onClick={() => handleSetEndpoint("auth")}>Authentication</button>
					</li>
					<li className={activeEndpoint === "air-quality" ? "active" : ""}>
						<button onClick={() => handleSetEndpoint("air-quality")}>Air Quality Data</button>
					</li>
					<li className={activeEndpoint === "alerts" ? "active" : ""}>
						<button onClick={() => handleSetEndpoint("alerts")}>Alert Management</button>
					</li>
					<li className={activeEndpoint === "system" ? "active" : ""}>
						<button onClick={() => handleSetEndpoint("system")}>System Endpoints</button>
					</li>
					<li className={activeEndpoint === "examples" ? "active" : ""}>
						<button onClick={() => handleSetEndpoint("examples")}>Code Examples</button>
					</li>
					<li className={activeEndpoint === "api-security" ? "active" : ""}>
						<button onClick={() => handleSetEndpoint("api-security")}>API Security</button>
					</li>
				</ul>
			</div>

			<div className="api-content">
				<div className="api-intro">
					<h1>AirAlert API Documentation</h1>
					<p>
						Welcome to the AirAlert API reference. This documentation provides all the information you need to get started with the AirAlert API. Our RESTful API allows you to access real-time and
						historical air quality data, manage alerts, and more.
					</p>
					<div className="api-base-url">
						<h3>Base URL</h3>
						<div className="code-block">
							<pre>
								<code>https://api.airalert.org/v1</code>
							</pre>
						</div>
					</div>
				</div>

				<section id="auth" className={activeEndpoint === "auth" ? "active" : ""}>
					<h2>Authentication Endpoints</h2>
					<p>AirAlert uses JSON Web Tokens (JWT) for authentication. You'll need to register an account and obtain an access token before using most API endpoints.</p>

					<div className="endpoint">
						<h3>Register a new user</h3>
						<div className="endpoint-details">
							<div className="method post">POST</div>
							<div className="path">/api/register</div>
						</div>
						<p>Create a new user account to access AirAlert API.</p>

						<h4>Request Body</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "register-req" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												email: "user@example.com",
												password: "securepassword",
												name: "John Doe",
												location: {
													latitude: 28.6139,
													longitude: 77.209,
												},
											},
											null,
											2
										),
										"register-req"
									)
								}
							>
								{copied === "register-req" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}`}
								</code>
							</pre>
						</div>

						<h4>Response</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "register-res" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												id: "user_123456",
												email: "user@example.com",
												name: "John Doe",
												created_at: "2025-05-15T10:30:00Z",
											},
											null,
											2
										),
										"register-res"
									)
								}
							>
								{copied === "register-res" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "id": "user_123456",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2025-05-15T10:30:00Z"
}`}
								</code>
							</pre>
						</div>
					</div>

					<div className="endpoint">
						<h3>Get an access token</h3>
						<div className="endpoint-details">
							<div className="method post">POST</div>
							<div className="path">/api/token</div>
						</div>
						<p>Obtain a JWT access token for API authentication.</p>

						<h4>Request Body</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "token-req" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												email: "user@example.com",
												password: "securepassword",
											},
											null,
											2
										),
										"token-req"
									)
								}
							>
								{copied === "token-req" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "email": "user@example.com",
  "password": "securepassword"
}`}
								</code>
							</pre>
						</div>

						<h4>Response</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "token-res" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
												token_type: "bearer",
												expires_in: 3600,
											},
											null,
											2
										),
										"token-res"
									)
								}
							>
								{copied === "token-res" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}`}
								</code>
							</pre>
						</div>
					</div>

					<div className="endpoint">
						<h3>Get current user info</h3>
						<div className="endpoint-details">
							<div className="method get">GET</div>
							<div className="path">/api/users/me</div>
						</div>
						<p>Retrieve information about the currently authenticated user.</p>

						<h4>Headers</h4>
						<div className="code-block">
							<pre>
								<code>Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</code>
							</pre>
						</div>

						<h4>Response</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "user-res" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												id: "user_123456",
												email: "user@example.com",
												name: "John Doe",
												preferences: {
													notification_channels: ["email", "push"],
													alert_thresholds: {
														"PM2.5": 35,
														O3: 100,
													},
												},
												location: {
													latitude: 28.6139,
													longitude: 77.209,
													city: "Delhi",
													country: "IN",
												},
												created_at: "2025-05-15T10:30:00Z",
											},
											null,
											2
										),
										"user-res"
									)
								}
							>
								{copied === "user-res" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "id": "user_123456",
  "email": "user@example.com",
  "name": "John Doe",
  "preferences": {
    "notification_channels": ["email", "push"],
    "alert_thresholds": {
      "PM2.5": 35,
      "O3": 100
    }
  },
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "city": "Delhi",
    "country": "IN"
  },
  "created_at": "2025-05-15T10:30:00Z"
}`}
								</code>
							</pre>
						</div>
					</div>
				</section>

				<section id="air-quality" className={activeEndpoint === "air-quality" ? "active" : ""}>
					<h2>Air Quality Data Endpoints</h2>
					<p>These endpoints provide access to air quality data from monitoring stations, satellites, and other sources integrated into the AirAlert platform.</p>

					<div className="endpoint">
						<h3>Get list of monitoring stations</h3>
						<div className="endpoint-details">
							<div className="method get">GET</div>
							<div className="path">/api/monitoring_stations</div>
						</div>
						<p>Retrieve a list of air quality monitoring stations with their metadata.</p>

						<h4>Query Parameters</h4>
						<table className="params-table">
							<thead>
								<tr>
									<th>Parameter</th>
									<th>Type</th>
									<th>Required</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>country</td>
									<td>string</td>
									<td>No</td>
									<td>ISO country code (e.g., "IN" for India)</td>
								</tr>
								<tr>
									<td>radius</td>
									<td>number</td>
									<td>No</td>
									<td>Search radius in kilometers</td>
								</tr>
								<tr>
									<td>lat</td>
									<td>number</td>
									<td>No</td>
									<td>Latitude for radius search</td>
								</tr>
								<tr>
									<td>lon</td>
									<td>number</td>
									<td>No</td>
									<td>Longitude for radius search</td>
								</tr>
							</tbody>
						</table>

						<h4>Response</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "stations-res" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												stations: [
													{
														id: "station_123",
														name: "South Delhi - Nehru Place",
														type: "government",
														source: "openaq",
														location: {
															latitude: 28.5483,
															longitude: 77.2545,
															city: "Delhi",
															country: "IN",
														},
														parameters: ["PM2.5", "PM10", "O3", "NO2", "SO2", "CO"],
														active: true,
														last_updated: "2025-05-15T11:45:00Z",
													},
													{
														id: "station_124",
														name: "East Delhi - Anand Vihar",
														type: "government",
														source: "openaq",
														location: {
															latitude: 28.6468,
															longitude: 77.3152,
															city: "Delhi",
															country: "IN",
														},
														parameters: ["PM2.5", "PM10", "O3", "NO2"],
														active: true,
														last_updated: "2025-05-15T11:35:00Z",
													},
												],
												count: 2,
												total: 245,
											},
											null,
											2
										),
										"stations-res"
									)
								}
							>
								{copied === "stations-res" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "stations": [
    {
      "id": "station_123",
      "name": "South Delhi - Nehru Place",
      "type": "government",
      "source": "openaq",
      "location": {
        "latitude": 28.5483,
        "longitude": 77.2545,
        "city": "Delhi",
        "country": "IN"
      },
      "parameters": ["PM2.5", "PM10", "O3", "NO2", "SO2", "CO"],
      "active": true,
      "last_updated": "2025-05-15T11:45:00Z"
    },
    {
      "id": "station_124",
      "name": "East Delhi - Anand Vihar",
      "type": "government",
      "source": "openaq",
      "location": {
        "latitude": 28.6468,
        "longitude": 77.3152,
        "city": "Delhi",
        "country": "IN"
      },
      "parameters": ["PM2.5", "PM10", "O3", "NO2"],
      "active": true,
      "last_updated": "2025-05-15T11:35:00Z"
    }
  ],
  "count": 2,
  "total": 245
}`}
								</code>
							</pre>
						</div>
					</div>

					<div className="endpoint">
						<h3>Get air quality readings</h3>
						<div className="endpoint-details">
							<div className="method get">GET</div>
							<div className="path">/api/air_quality</div>
						</div>
						<p>Retrieve air quality readings for specific locations and parameters.</p>

						<h4>Query Parameters</h4>
						<table className="params-table">
							<thead>
								<tr>
									<th>Parameter</th>
									<th>Type</th>
									<th>Required</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>stations</td>
									<td>string</td>
									<td>No</td>
									<td>Comma-separated station IDs</td>
								</tr>
								<tr>
									<td>parameters</td>
									<td>string</td>
									<td>No</td>
									<td>Comma-separated pollutant types (PM2.5, O3, etc.)</td>
								</tr>
								<tr>
									<td>start_date</td>
									<td>string</td>
									<td>No</td>
									<td>ISO date format (YYYY-MM-DD)</td>
								</tr>
								<tr>
									<td>end_date</td>
									<td>string</td>
									<td>No</td>
									<td>ISO date format (YYYY-MM-DD)</td>
								</tr>
								<tr>
									<td>lat</td>
									<td>number</td>
									<td>No</td>
									<td>Latitude for location-based search</td>
								</tr>
								<tr>
									<td>lon</td>
									<td>number</td>
									<td>No</td>
									<td>Longitude for location-based search</td>
								</tr>
							</tbody>
						</table>

						<h4>Response</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "airquality-res" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												readings: [
													{
														station_id: "station_123",
														station_name: "South Delhi - Nehru Place",
														parameter: "PM2.5",
														value: 75.4,
														unit: "µg/m³",
														timestamp: "2025-05-15T11:00:00Z",
														aqi_value: 158,
														aqi_category: "Unhealthy",
														source: "openaq",
													},
													{
														station_id: "station_123",
														station_name: "South Delhi - Nehru Place",
														parameter: "O3",
														value: 42.1,
														unit: "ppb",
														timestamp: "2025-05-15T11:00:00Z",
														aqi_value: 38,
														aqi_category: "Good",
														source: "openaq",
													},
												],
												count: 2,
												timestamp_local: "2025-05-15 16:30:00 IST",
											},
											null,
											2
										),
										"airquality-res"
									)
								}
							>
								{copied === "airquality-res" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "readings": [
    {
      "station_id": "station_123",
      "station_name": "South Delhi - Nehru Place",
      "parameter": "PM2.5",
      "value": 75.4,
      "unit": "µg/m³",
      "timestamp": "2025-05-15T11:00:00Z",
      "aqi_value": 158,
      "aqi_category": "Unhealthy",
      "source": "openaq"
    },
    {
      "station_id": "station_123",
      "station_name": "South Delhi - Nehru Place",
      "parameter": "O3",
      "value": 42.1,
      "unit": "ppb",
      "timestamp": "2025-05-15T11:00:00Z",
      "aqi_value": 38,
      "aqi_category": "Good",
      "source": "openaq"
    }
  ],
  "count": 2,
  "timestamp_local": "2025-05-15 16:30:00 IST"
}`}
								</code>
							</pre>
						</div>
					</div>
				</section>

				<section id="alerts" className={activeEndpoint === "alerts" ? "active" : ""}>
					<h2>Alert Management Endpoints</h2>
					<p>These endpoints allow you to manage air quality alerts and notifications.</p>

					<div className="endpoint">
						<h3>Check for threshold exceedances</h3>
						<div className="endpoint-details">
							<div className="method post">POST</div>
							<div className="path">/api/check_alerts</div>
						</div>
						<p>Check if current air quality exceeds user-defined thresholds.</p>

						<h4>Request Body</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "check-alerts-req" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												location: {
													latitude: 28.6139,
													longitude: 77.209,
												},
												thresholds: {
													"PM2.5": 50,
													O3: 100,
													NO2: 100,
													SO2: 75,
												},
											},
											null,
											2
										),
										"check-alerts-req"
									)
								}
							>
								{copied === "check-alerts-req" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "thresholds": {
    "PM2.5": 50,
    "O3": 100,
    "NO2": 100,
    "SO2": 75
  }
}`}
								</code>
							</pre>
						</div>

						<h4>Response</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "check-alerts-res" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												exceedances: [
													{
														parameter: "PM2.5",
														current_value: 75.4,
														threshold_value: 50,
														unit: "µg/m³",
														exceedance_percentage: 50.8,
														aqi_value: 158,
														aqi_category: "Unhealthy",
													},
												],
												alert_generated: true,
												alert_id: "alert_789012",
												nearest_station: {
													id: "station_123",
													name: "South Delhi - Nehru Place",
													distance_km: 2.4,
												},
											},
											null,
											2
										),
										"check-alerts-res"
									)
								}
							>
								{copied === "check-alerts-res" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "exceedances": [
    {
      "parameter": "PM2.5",
      "current_value": 75.4,
      "threshold_value": 50,
      "unit": "µg/m³",
      "exceedance_percentage": 50.8,
      "aqi_value": 158,
      "aqi_category": "Unhealthy"
    }
  ],
  "alert_generated": true,
  "alert_id": "alert_789012",
  "nearest_station": {
    "id": "station_123",
    "name": "South Delhi - Nehru Place",
    "distance_km": 2.4
  }
}`}
								</code>
							</pre>
						</div>
					</div>

					<div className="endpoint">
						<h3>Get active alerts</h3>
						<div className="endpoint-details">
							<div className="method get">GET</div>
							<div className="path">/api/alerts</div>
						</div>
						<p>Retrieve currently active alerts for the authenticated user.</p>

						<h4>Response</h4>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "alerts-res" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										JSON.stringify(
											{
												alerts: [
													{
														id: "alert_789012",
														type: "threshold_exceedance",
														severity: "high",
														parameters: ["PM2.5"],
														location: {
															latitude: 28.6139,
															longitude: 77.209,
															city: "Delhi",
															country: "IN",
														},
														message:
															"PM2.5 levels are currently 75.4 µg/m³, exceeding your threshold of 50 µg/m³ by 50.8%. This is considered Unhealthy. Consider staying indoors or wearing a mask if you must go outside.",
														created_at: "2025-05-15T11:30:00Z",
														expires_at: "2025-05-15T17:30:00Z",
														is_active: true,
													},
												],
												count: 1,
											},
											null,
											2
										),
										"alerts-res"
									)
								}
							>
								{copied === "alerts-res" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`{
  "alerts": [
    {
      "id": "alert_789012",
      "type": "threshold_exceedance",
      "severity": "high",
      "parameters": ["PM2.5"],
      "location": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "city": "Delhi",
        "country": "IN"
      },
      "message": "PM2.5 levels are currently 75.4 µg/m³, exceeding your threshold of 50 µg/m³ by 50.8%. This is considered Unhealthy. Consider staying indoors or wearing a mask if you must go outside.",
      "created_at": "2025-05-15T11:30:00Z",
      "expires_at": "2025-05-15T17:30:00Z",
      "is_active": true
    }
  ],
  "count": 1
}`}
								</code>
							</pre>
						</div>
					</div>
				</section>

				<section id="system" className={activeEndpoint === "system" ? "active" : ""}>
					<h2>System Endpoints</h2>
					<p>These endpoints provide system-level information and utilities.</p>

					<div className="endpoint">
						<h3>Health check endpoint</h3>
						<div className="endpoint-details">
							<div className="method get">GET</div>
							<div className="path">/health</div>
						</div>
						<p>Check if the API server is running correctly.</p>

						<h4>Response</h4>
						<div className="code-block">
							<pre>
								<code>
									{`{
  "status": "healthy",
  "version": "1.0.5",
  "uptime": "3d 7h 23m 12s",
  "database_connection": "ok",
  "services": {
    "openaq_api": "ok",
    "notification_service": "ok",
    "prediction_model": "ok"
  }
}`}
								</code>
							</pre>
						</div>
					</div>

					<div className="endpoint">
						<h3>Get interactive map data</h3>
						<div className="endpoint-details">
							<div className="method get">GET</div>
							<div className="path">/api/map</div>
						</div>
						<p>Retrieve geospatial data for rendering interactive maps.</p>

						<h4>Query Parameters</h4>
						<table className="params-table">
							<thead>
								<tr>
									<th>Parameter</th>
									<th>Type</th>
									<th>Required</th>
									<th>Description</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td>lat</td>
									<td>number</td>
									<td>No</td>
									<td>Center latitude for map view</td>
								</tr>
								<tr>
									<td>lon</td>
									<td>number</td>
									<td>No</td>
									<td>Center longitude for map view</td>
								</tr>
								<tr>
									<td>zoom</td>
									<td>number</td>
									<td>No</td>
									<td>Map zoom level (0-18)</td>
								</tr>
								<tr>
									<td>parameters</td>
									<td>string</td>
									<td>No</td>
									<td>Comma-separated pollutant types</td>
								</tr>
							</tbody>
						</table>

						<h4>Response</h4>
						<p>The response contains GeoJSON data representing air quality levels across the map area.</p>
					</div>
				</section>

				<section id="examples" className={activeEndpoint === "examples" ? "active" : ""}>
					<h2>Code Examples</h2>
					<p>Here are some examples of how to use the AirAlert API in different programming languages.</p>

					<div className="code-example">
						<h3>JavaScript (with Fetch API)</h3>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "javascript-example" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										`// Get an access token
async function getAccessToken(email, password) {
  const response = await fetch('https://api.airalert.org/v1/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}

// Get air quality readings for current location
async function getCurrentAirQuality(token, lat, lon) {
  const response = await fetch(\`https://api.airalert.org/v1/api/air_quality?lat=\${lat}&lon=\${lon}\`, {
    headers: {
      'Authorization': \`Bearer \${token}\`
    }
  });
  
  return await response.json();
}

// Example usage
async function main() {
  try {
    const token = await getAccessToken('user@example.com', 'password');
    const airQuality = await getCurrentAirQuality(token, 28.6139, 77.2090);
    
    console.log('Current air quality readings:', airQuality.readings);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();`,
										"javascript-example"
									)
								}
							>
								{copied === "javascript-example" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`// Get an access token
async function getAccessToken(email, password) {
  const response = await fetch('https://api.airalert.org/v1/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}

// Get air quality readings for current location
async function getCurrentAirQuality(token, lat, lon) {
  const response = await fetch(\`https://api.airalert.org/v1/api/air_quality?lat=\${lat}&lon=\${lon}\`, {
    headers: {
      'Authorization': \`Bearer \${token}\`
    }
  });
  
  return await response.json();
}

// Example usage
async function main() {
  try {
    const token = await getAccessToken('user@example.com', 'password');
    const airQuality = await getCurrentAirQuality(token, 28.6139, 77.2090);
    
    console.log('Current air quality readings:', airQuality.readings);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();`}
								</code>
							</pre>
						</div>
					</div>

					<div className="code-example">
						<h3>Python (with requests library)</h3>
						<div className="code-block">
							<button
								className={`copy-button ${copied === "python-example" ? "copied" : ""}`}
								onClick={() =>
									handleCopyCode(
										`import requests

API_BASE_URL = "https://api.airalert.org/v1"

def get_access_token(email, password):
    """Get API access token for authentication."""
    response = requests.post(
        f"{API_BASE_URL}/api/token",
        json={"email": email, "password": password}
    )
    response.raise_for_status()
    return response.json()["access_token"]

def get_air_quality(token, lat, lon, parameters=None):
    """Get current air quality for a location."""
    headers = {"Authorization": f"Bearer {token}"}
    params = {"lat": lat, "lon": lon}
    
    if parameters:
        params["parameters"] = parameters
    
    response = requests.get(
        f"{API_BASE_URL}/api/air_quality",
        headers=headers,
        params=params
    )
    response.raise_for_status()
    return response.json()

def check_alerts(token, lat, lon, thresholds):
    """Check if air quality exceeds specified thresholds."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "location": {"latitude": lat, "longitude": lon},
        "thresholds": thresholds
    }
    
    response = requests.post(
        f"{API_BASE_URL}/api/check_alerts",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

# Example usage
if __name__ == "__main__":
    try:
        # Get token
        token = get_access_token("user@example.com", "password")
        
        # Get air quality
        air_quality = get_air_quality(token, 28.6139, 77.2090, "PM2.5,O3")
        print(f"Found {air_quality['count']} readings")
        
        # Check if thresholds are exceeded
        thresholds = {"PM2.5": 50, "O3": 100}
        alerts = check_alerts(token, 28.6139, 77.2090, thresholds)
        
        if alerts.get("alert_generated"):
            print("Alert generated! Exceedances found:")
            for exc in alerts["exceedances"]:
                print(f"- {exc['parameter']}: {exc['current_value']} {exc['unit']}")
        else:
            print("No alerts generated - air quality within thresholds.")
            
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")`,
										"python-example"
									)
								}
							>
								{copied === "python-example" ? "Copied!" : "Copy"}
							</button>
							<pre>
								<code>
									{`import requests

API_BASE_URL = "https://api.airalert.org/v1"

def get_access_token(email, password):
    """Get API access token for authentication."""
    response = requests.post(
        f"{API_BASE_URL}/api/token",
        json={"email": email, "password": password}
    )
    response.raise_for_status()
    return response.json()["access_token"]

def get_air_quality(token, lat, lon, parameters=None):
    """Get current air quality for a location."""
    headers = {"Authorization": f"Bearer {token}"}
    params = {"lat": lat, "lon": lon}
    
    if parameters:
        params["parameters"] = parameters
    
    response = requests.get(
        f"{API_BASE_URL}/api/air_quality",
        headers=headers,
        params=params
    )
    response.raise_for_status()
    return response.json()

def check_alerts(token, lat, lon, thresholds):
    """Check if air quality exceeds specified thresholds."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "location": {"latitude": lat, "longitude": lon},
        "thresholds": thresholds
    }
    
    response = requests.post(
        f"{API_BASE_URL}/api/check_alerts",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

# Example usage
if __name__ == "__main__":
    try:
        # Get token
        token = get_access_token("user@example.com", "password")
        
        # Get air quality
        air_quality = get_air_quality(token, 28.6139, 77.2090, "PM2.5,O3")
        print(f"Found {air_quality['count']} readings")
        
        # Check if thresholds are exceeded
        thresholds = {"PM2.5": 50, "O3": 100}
        alerts = check_alerts(token, 28.6139, 77.2090, thresholds)
        
        if alerts.get("alert_generated"):
            print("Alert generated! Exceedances found:")
            for exc in alerts["exceedances"]:
                print(f"- {exc['parameter']}: {exc['current_value']} {exc['unit']}")
        else:
            print("No alerts generated - air quality within thresholds.")
            
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
`}
								</code>
							</pre>
						</div>
					</div>
				</section>

				<section id="api-security" className={activeEndpoint === "api-security" ? "active" : ""}>
					<h2>API Security</h2>
					<p>AirAlert implements several security measures to protect the API and user data:</p>

					<h3>Authentication</h3>
					<ul>
						<li>
							<strong>JWT-based authentication</strong> - All authenticated API endpoints require a valid JWT token.
						</li>
						<li>
							<strong>Token expiration</strong> - Access tokens have a default expiration of 1 hour.
						</li>
						<li>
							<strong>Password hashing</strong> - User passwords are stored using bcrypt with appropriate work factors.
						</li>
					</ul>

					<h3>Request Protection</h3>
					<ul>
						<li>
							<strong>HTTPS only</strong> - All API communications require HTTPS.
						</li>
						<li>
							<strong>Rate limiting</strong> - API endpoints have rate limits to prevent abuse.
						</li>
						<li>
							<strong>Input validation</strong> - All inputs are validated and sanitized to prevent injection attacks.
						</li>
					</ul>

					<h3>Best Practices</h3>
					<ul>
						<li>Keep your API tokens secure and do not share them in client-side code.</li>
						<li>Implement proper error handling in your applications.</li>
						<li>Use the minimum necessary API permissions for your use case.</li>
						<li>Refresh access tokens regularly for long-running applications.</li>
					</ul>

					<div className="security-contact">
						<h3>Security Contact</h3>
						<p>
							If you discover any security vulnerabilities, please report them to our security team at
							<a href="mailto:security@airalert.org"> security@airalert.org</a>.
						</p>
					</div>
				</section>
			</div>
		</div>
	);
};

export default ApiReferencePage;

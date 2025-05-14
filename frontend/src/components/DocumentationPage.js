import React, { useState } from "react";
import "./DocumentationPage.css";

const DocumentationPage = () => {
	const [activeSection, setActiveSection] = useState("getting-started");

	const handleSetSection = (section) => {
		setActiveSection(section);
		// Smooth scrolling to section
		document.getElementById(section).scrollIntoView({ behavior: "smooth" });
	};

	return (
		<div className="documentation-container">
			<div className="documentation-sidebar">
				<h3>Documentation</h3>
				<ul>
					<li className={activeSection === "getting-started" ? "active" : ""}>
						<button onClick={() => handleSetSection("getting-started")}>Getting Started</button>
					</li>
					<li className={activeSection === "installation" ? "active" : ""}>
						<button onClick={() => handleSetSection("installation")}>Installation</button>
					</li>
					<li className={activeSection === "air-quality-data" ? "active" : ""}>
						<button onClick={() => handleSetSection("air-quality-data")}>Air Quality Data</button>
					</li>
					<li className={activeSection === "alert-system" ? "active" : ""}>
						<button onClick={() => handleSetSection("alert-system")}>Alert System</button>
					</li>
					<li className={activeSection === "faqs" ? "active" : ""}>
						<button onClick={() => handleSetSection("faqs")}>FAQs</button>
					</li>
					<li className={activeSection === "troubleshooting" ? "active" : ""}>
						<button onClick={() => handleSetSection("troubleshooting")}>Troubleshooting</button>
					</li>
				</ul>
			</div>

			<div className="documentation-content">
				<section id="getting-started" className={activeSection === "getting-started" ? "active" : ""}>
					<h2>Getting Started with AirAlert</h2>
					<p>
						AirAlert is an intelligent air quality monitoring and alert system that combines real-time air quality data, AI-driven predictions, and personalized notifications to help communities and
						individuals stay informed about air pollution risks.
					</p>

					<h3>Key Features</h3>
					<ul>
						<li>
							<strong>Real-time Air Quality Monitoring:</strong> Integration with OpenAQ, Sentinel-5P, and MODIS data sources for comprehensive air quality information.
						</li>
						<li>
							<strong>Interactive Maps:</strong> Visualize air pollution data with dynamic maps showing pollution hotspots and affected areas.
						</li>
						<li>
							<strong>Personalized Alerts:</strong> Receive customized alerts based on location, sensitivity profile, and air quality thresholds.
						</li>
						<li>
							<strong>LLM-Powered Insights:</strong> Leverages OpenAI models to generate natural language alerts and recommendations.
						</li>
						<li>
							<strong>Predictive Analysis:</strong> Forecast pollution patterns using AI-driven models.
						</li>
						<li>
							<strong>Weather Correlation:</strong> Integrate weather data to analyze correlations with pollution levels.
						</li>
					</ul>
				</section>

				<section id="installation" className={activeSection === "installation" ? "active" : ""}>
					<h2>Installation</h2>
					<h3>Prerequisites</h3>
					<ul>
						<li>Python 3.12+</li>
						<li>Node.js 16+</li>
						<li>PostgreSQL with PostGIS (optional for production)</li>
						<li>Docker and Docker Compose (for containerized deployment)</li>
					</ul>

					<h3>Development Setup</h3>
					<div className="code-block">
						<pre>
							<code>
								{`# Clone the repository
git clone https://github.com/Swayam2004/AirAlert.git
cd airalert

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install Python dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.sample .env
# Edit .env with your configuration

# Setup the database
alembic upgrade head

# Install frontend dependencies
cd frontend
npm install
cd ..`}
							</code>
						</pre>
					</div>

					<h3>Running the Application</h3>
					<div className="code-block">
						<pre>
							<code>
								{`# Start the backend server
python main.py
# The API will be available at http://localhost:8000

# Start the frontend development server
cd frontend
npm start
# The frontend will be available at http://localhost:3000`}
							</code>
						</pre>
					</div>
				</section>

				<section id="air-quality-data" className={activeSection === "air-quality-data" ? "active" : ""}>
					<h2>Air Quality Data</h2>
					<p>AirAlert integrates multiple data sources to provide comprehensive air quality information:</p>

					<h3>OpenAQ</h3>
					<p>AirAlert integrates with the OpenAQ API to fetch global air quality data from government sensors. The system retrieves:</p>
					<ul>
						<li>Station metadata (location, name, etc.)</li>
						<li>Pollutant readings (PM2.5, PM10, O3, NO2, SO2, CO)</li>
					</ul>

					<h3>Sentinel-5P</h3>
					<p>The Sentinel-5P satellite provides atmospheric data for:</p>
					<ul>
						<li>NO2, SO2, O3, CO concentrations</li>
						<li>CH4 (methane) levels</li>
						<li>Aerosol index</li>
					</ul>

					<h3>Weather Data</h3>
					<p>Weather information is integrated from:</p>
					<ul>
						<li>NOAA for global weather data</li>
						<li>IMD (Indian Meteorological Department) for Indian weather data</li>
					</ul>
				</section>

				<section id="alert-system" className={activeSection === "alert-system" ? "active" : ""}>
					<h2>Alert System</h2>
					<p>AirAlert's alert system works as follows:</p>

					<ol>
						<li>
							<strong>Data Collection:</strong> Regular fetching of air quality data from multiple sources.
						</li>
						<li>
							<strong>Threshold Analysis:</strong> Identification of areas exceeding safe pollution levels.
						</li>
						<li>
							<strong>Alert Generation:</strong> Creation of alerts with severity levels and affected areas.
						</li>
						<li>
							<strong>Message Customization:</strong> LLM-powered generation of personalized alert messages.
						</li>
						<li>
							<strong>Notification Delivery:</strong> Multi-channel alert delivery (app, email, SMS).
						</li>
					</ol>

					<p>Alert severity is determined based on established health guidelines for each pollutant.</p>

					<h3>Alert Configuration</h3>
					<p>Users can configure personalized alerts based on:</p>
					<ul>
						<li>Location preferences</li>
						<li>Sensitivity thresholds</li>
						<li>Notification channels</li>
						<li>Time-of-day preferences</li>
					</ul>
				</section>

				<section id="faqs" className={activeSection === "faqs" ? "active" : ""}>
					<h2>Frequently Asked Questions</h2>

					<div className="faq-item">
						<h3>What pollutants does AirAlert track?</h3>
						<p>AirAlert tracks PM2.5, PM10, O3 (Ozone), NO2 (Nitrogen Dioxide), SO2 (Sulfur Dioxide), CO (Carbon Monoxide), and other regional pollutants.</p>
					</div>

					<div className="faq-item">
						<h3>How accurate are the air quality predictions?</h3>
						<p>AirAlert's predictions are based on multiple data sources and AI models with an average accuracy of 85-90% for 24-hour forecasts, decreasing to around 70-75% for 72-hour forecasts.</p>
					</div>

					<div className="faq-item">
						<h3>How often is the data updated?</h3>
						<p>Ground station data is typically updated hourly, while satellite data is updated once or twice daily depending on the specific data source and orbital patterns.</p>
					</div>

					<div className="faq-item">
						<h3>Can I access historical air quality data?</h3>
						<p>Yes, AirAlert stores historical data and makes it available through the Data Explorer page, where you can analyze trends and patterns over custom time ranges.</p>
					</div>

					<div className="faq-item">
						<h3>How do I set up custom alerts?</h3>
						<p>Navigate to the Profile page, select "Alert Preferences," and choose your locations, pollutants of interest, and threshold levels for notifications.</p>
					</div>
				</section>

				<section id="troubleshooting" className={activeSection === "troubleshooting" ? "active" : ""}>
					<h2>Troubleshooting</h2>

					<h3>Common Issues</h3>

					<div className="troubleshooting-item">
						<h4>API Connection Problems</h4>
						<div className="code-block">
							<pre>
								<code>
									{`# Check if the API server is running
curl http://localhost:8000/health

# Verify environment variables
cat .env | grep API`}
								</code>
							</pre>
						</div>
					</div>

					<div className="troubleshooting-item">
						<h4>Database Migration Errors</h4>
						<div className="code-block">
							<pre>
								<code>
									{`# Reset migrations
alembic revision --autogenerate -m "reset"
alembic upgrade head`}
								</code>
							</pre>
						</div>
					</div>

					<div className="troubleshooting-item">
						<h4>Frontend Build Issues</h4>
						<div className="code-block">
							<pre>
								<code>
									{`# Clean npm cache
npm cache clean --force
npm install --legacy-peer-deps`}
								</code>
							</pre>
						</div>
					</div>

					<h3>Still Having Problems?</h3>
					<p>
						Contact our support team at <a href="mailto:support@airalert.org">support@airalert.org</a> or submit an issue on our{" "}
						<a href="https://github.com/Swayam2004/AirAlert/issues" target="_blank" rel="noopener noreferrer">
							GitHub repository
						</a>
						.
					</p>
				</section>
			</div>
		</div>
	);
};

export default DocumentationPage;

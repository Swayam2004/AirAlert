import React from "react";

const PrivacyPolicyPage = () => {
	return (
		<div className="privacy-policy container">
			<header className="page-header">
				<h1>Privacy Policy</h1>
				<p className="text-muted">Effective Date: May 1, 2025</p>
			</header>

			<section className="policy-section">
				<h2>Overview</h2>
				<p>
					We value your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information when you use our AI-powered air quality
					monitoring services.
				</p>
			</section>

			<section className="policy-section">
				<h2>Data Collection</h2>
				<div className="card">
					<h3>Information We Collect</h3>
					<ul className="feature-list">
						<li>
							<span className="feature-icon">📍</span>
							<div className="feature-content">
								<strong>Location Data</strong>
								<p>To provide localized air quality information and alerts relevant to your area.</p>
							</div>
						</li>
						<li>
							<span className="feature-icon">👤</span>
							<div className="feature-content">
								<strong>User Profile Information</strong>
								<p>Including health sensitivity profiles to personalize air quality threshold alerts.</p>
							</div>
						</li>
						<li>
							<span className="feature-icon">🔔</span>
							<div className="feature-content">
								<strong>Notification Preferences</strong>
								<p>Your preferences for receiving alerts through various channels.</p>
							</div>
						</li>
						<li>
							<span className="feature-icon">📱</span>
							<div className="feature-content">
								<strong>Device Information</strong>
								<p>Technical data about your device for service optimization.</p>
							</div>
						</li>
					</ul>
				</div>
			</section>

			<section className="policy-section">
				<h2>Data Usage</h2>
				<p>Your data is used for:</p>
				<ul>
					<li>
						<strong>Personalized Alerts:</strong> Delivering timely air quality notifications based on your location and sensitivity profile
					</li>
					<li>
						<strong>AI-Powered Insights:</strong> Training our predictive models to improve air quality forecasts
					</li>
					<li>
						<strong>Service Improvement:</strong> Enhancing the accuracy and functionality of our monitoring systems
					</li>
					<li>
						<strong>Weather Correlation:</strong> Analyzing relationships between weather patterns and air quality
					</li>
				</ul>
			</section>

			<section className="policy-section">
				<h2>Data Protection</h2>
				<p>We implement robust security measures to protect your data, including:</p>
				<div className="security-features">
					<div className="security-feature">
						<span className="security-icon">🔒</span>
						<strong>Encryption</strong>
						<p>All data transmitted between your device and our servers is encrypted</p>
					</div>
					<div className="security-feature">
						<span className="security-icon">🛡️</span>
						<strong>Access Controls</strong>
						<p>Strict access controls limit who can access your personal information</p>
					</div>
					<div className="security-feature">
						<span className="security-icon">🔍</span>
						<strong>Regular Audits</strong>
						<p>We conduct security audits to ensure compliance with best practices</p>
					</div>
				</div>
			</section>

			<section className="policy-section">
				<h2>Third-Party Data Sources</h2>
				<p>We integrate data from the following sources to provide comprehensive air quality information:</p>
				<ul>
					<li>
						<strong>OpenAQ:</strong> Global air quality data
					</li>
					<li>
						<strong>Sentinel-5P:</strong> Satellite imagery for pollution detection
					</li>
					<li>
						<strong>MODIS:</strong> Aerosol optical depth measurements
					</li>
				</ul>
			</section>

			<section className="policy-section">
				<h2>Contact Information</h2>
				<p>
					If you have any questions about our privacy practices, please contact us at <a href="mailto:privacy@airalert.com">privacy@airalert.com</a>.
				</p>
			</section>
		</div>
	);
};

export default PrivacyPolicyPage;

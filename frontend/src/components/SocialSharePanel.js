import React, { useState, useRef } from "react";
import "../styles/SocialSharePanel.css";

/**
 * Social Sharing Component
 * Allows users to share air quality insights via various platforms
 */
const SocialSharePanel = ({ data, selectedPollutant, pollutantConfig, dashboardState }) => {
	const [shareUrl, setShareUrl] = useState("");
	const [showCopySuccess, setShowCopySuccess] = useState(false);
	const linkRef = useRef(null);

	// Generate the share URL with the current dashboard state
	const generateShareUrl = () => {
		try {
			// Create a URL object for the current location
			const url = new URL(window.location.href);

			// Add query parameters for the current dashboard state
			if (dashboardState) {
				// Add pollutant
				url.searchParams.set("pollutant", selectedPollutant);

				// Add time range
				if (dashboardState.timeRange) {
					url.searchParams.set("timeRange", dashboardState.timeRange);
				}

				// Add date range if available
				if (dashboardState.dateRange?.start) {
					url.searchParams.set("startDate", dashboardState.dateRange.start.toISOString().split("T")[0]);
				}
				if (dashboardState.dateRange?.end) {
					url.searchParams.set("endDate", dashboardState.dateRange.end.toISOString().split("T")[0]);
				}

				// Add tab index if available
				if (dashboardState.activeTabIndex !== undefined) {
					url.searchParams.set("tab", dashboardState.activeTabIndex);
				}

				// Add selected regions if available (as comma-separated IDs)
				if (dashboardState.selectedRegions?.length) {
					const regionIds = dashboardState.selectedRegions.map((r) => r.id).join(",");
					url.searchParams.set("regions", regionIds);
				}
			}

			return url.toString();
		} catch (e) {
			console.error("Error generating share URL:", e);
			return window.location.href;
		}
	};

	// Handle "Copy Link" button click
	const handleCopyLink = () => {
		const shareLink = generateShareUrl();
		setShareUrl(shareLink);

		// Copy to clipboard
		navigator.clipboard
			.writeText(shareLink)
			.then(() => {
				setShowCopySuccess(true);
				setTimeout(() => setShowCopySuccess(false), 2000);
			})
			.catch((err) => {
				console.error("Could not copy text: ", err);
				// Fallback for browsers without clipboard API
				if (linkRef.current) {
					linkRef.current.select();
					document.execCommand("copy");
				}
			});
	};

	// Share on different social platforms
	const shareOnPlatform = (platform) => {
		const shareLink = generateShareUrl();
		let shareWindowUrl;
		const encodedLink = encodeURIComponent(shareLink);
		const title = encodeURIComponent(`Air Quality Update: ${pollutantConfig[selectedPollutant].label} levels in my area`);
		const summary = encodeURIComponent(`Check out the latest air quality data for ${pollutantConfig[selectedPollutant].label}!`);

		switch (platform) {
			case "twitter":
				shareWindowUrl = `https://twitter.com/intent/tweet?url=${encodedLink}&text=${title}`;
				break;
			case "facebook":
				shareWindowUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
				break;
			case "linkedin":
				shareWindowUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedLink}&title=${title}&summary=${summary}`;
				break;
			case "whatsapp":
				shareWindowUrl = `https://api.whatsapp.com/send?text=${title}%20${encodedLink}`;
				break;
			case "email":
				window.location.href = `mailto:?subject=${title}&body=${summary}%0A${encodedLink}`;
				return;
			default:
				return;
		}

		// Open share window
		window.open(shareWindowUrl, "_blank", "width=600,height=400");
	};

	// Extract summary of the data for sharing
	const getDataSummary = () => {
		if (!data || data.length === 0) {
			return "No data available to share";
		}

		try {
			// Calculate average pollutant value
			const values = data.map((reading) => reading[selectedPollutant]).filter((val) => val !== null && val !== undefined);

			if (values.length === 0) return "No data available to share";

			const average = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
			const max = Math.max(...values).toFixed(2);

			return `Current average ${pollutantConfig[selectedPollutant].label}: ${average}${pollutantConfig[selectedPollutant].unit}, Max: ${max}${pollutantConfig[selectedPollutant].unit}`;
		} catch (e) {
			console.error("Error generating data summary:", e);
			return "Air quality data available";
		}
	};

	return (
		<div className="social-share-panel">
			<div className="social-share-header">
				<h3>Share this data</h3>
				<p className="share-summary">{getDataSummary()}</p>
			</div>

			<div className="social-buttons">
				<button className="share-button twitter" onClick={() => shareOnPlatform("twitter")} aria-label="Share on Twitter">
					<span className="platform-icon">𝕏</span>
					<span className="platform-name">Twitter</span>
				</button>

				<button className="share-button facebook" onClick={() => shareOnPlatform("facebook")} aria-label="Share on Facebook">
					<span className="platform-icon">f</span>
					<span className="platform-name">Facebook</span>
				</button>

				<button className="share-button linkedin" onClick={() => shareOnPlatform("linkedin")} aria-label="Share on LinkedIn">
					<span className="platform-icon">in</span>
					<span className="platform-name">LinkedIn</span>
				</button>

				<button className="share-button whatsapp" onClick={() => shareOnPlatform("whatsapp")} aria-label="Share on WhatsApp">
					<span className="platform-icon">W</span>
					<span className="platform-name">WhatsApp</span>
				</button>

				<button className="share-button email" onClick={() => shareOnPlatform("email")} aria-label="Share via Email">
					<span className="platform-icon">✉</span>
					<span className="platform-name">Email</span>
				</button>
			</div>

			<div className="copy-link-section">
				<input type="text" value={shareUrl || generateShareUrl()} className="share-link-input" readOnly ref={linkRef} aria-label="Shareable link" />
				<button className="copy-button" onClick={handleCopyLink} aria-label="Copy link">
					{showCopySuccess ? "Copied!" : "Copy Link"}
				</button>
			</div>
		</div>
	);
};

export default SocialSharePanel;

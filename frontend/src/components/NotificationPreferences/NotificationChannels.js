import React from "react";

const NotificationChannels = ({ channels, onToggle }) => (
	<div className="preferences-section">
		<h3>Notification Channels</h3>
		<p className="section-description">Choose how you want to receive air quality alerts</p>
		<div className="channel-options">
			{Object.keys(channels).map((channel) => (
				<label key={channel} className="channel-option">
					<input type="checkbox" checked={channels[channel]} onChange={() => onToggle(channel)} />
					<span className="channel-label">{channel.toUpperCase()}</span>
				</label>
			))}
		</div>
	</div>
);

export default NotificationChannels;

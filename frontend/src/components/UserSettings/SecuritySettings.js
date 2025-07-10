import React, { useState, useEffect } from "react";
import API from "../../services/api";

const SecuritySettings = ({ user, onSuccess, onError }) => {
	const [securityData, setSecurityData] = useState({
		twoFactorEnabled: false,
		activeSessions: [],
		loginHistory: [],
		dataSharing: true,
		autoLogout: 60, // minutes
	});

	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		const loadSecurityInfo = async () => {
			try {
				const data = await API.fetchSecurityInfo(user.id);
				setSecurityData((prev) => ({
					...prev,
					...data,
				}));
			} catch (err) {
				onError(err.message || "Failed to load security information");
			} finally {
				setIsLoading(false);
			}
		};

		loadSecurityInfo();
	}, [user.id, onError]);

	const handleInputChange = (e) => {
		const { name, value, type, checked } = e.target;
		setSecurityData((prev) => ({
			...prev,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handleSave = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			await API.updateSecuritySettings(user.id, {
				twoFactorEnabled: securityData.twoFactorEnabled,
				dataSharing: securityData.dataSharing,
				autoLogout: parseInt(securityData.autoLogout, 10),
			});

			onSuccess("Security settings updated successfully");
		} catch (err) {
			onError(err.message || "Failed to update security settings");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleLogoutAllSessions = async () => {
		setIsSubmitting(true);

		try {
			await API.logoutAllSessions(user.id);
			setSecurityData((prev) => ({
				...prev,
				activeSessions: [
					// Keep only current session
					prev.activeSessions.find((session) => session.isCurrent) || {},
				],
			}));
			onSuccess("Successfully logged out from all other devices");
		} catch (err) {
			onError(err.message || "Failed to logout from other devices");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="settings-loading">
				<div className="settings-spinner"></div>
				<div>Loading security information...</div>
			</div>
		);
	}

	return (
		<div className="settings-section">
			<div className="settings-card">
				<h3 className="settings-section-title">Security Settings</h3>
				<form onSubmit={handleSave}>
					<div className="toggle-container">
						<span className="toggle-label">Two-Factor Authentication</span>
						<label className="toggle-switch">
							<input type="checkbox" name="twoFactorEnabled" checked={securityData.twoFactorEnabled} onChange={handleInputChange} />
							<span className="toggle-slider"></span>
						</label>
					</div>

					{securityData.twoFactorEnabled && (
						<div className="settings-form-group">
							<p>Two-factor authentication is enabled. You'll receive a verification code each time you log in.</p>
							<button type="button" className="settings-button settings-button-secondary" style={{ marginTop: "10px" }}>
								Reconfigure 2FA
							</button>
						</div>
					)}

					<div className="settings-form-group">
						<label htmlFor="autoLogout" className="settings-label">
							Auto-logout after inactivity (minutes)
						</label>
						<select id="autoLogout" name="autoLogout" className="settings-input" value={securityData.autoLogout} onChange={handleInputChange}>
							<option value="15">15 minutes</option>
							<option value="30">30 minutes</option>
							<option value="60">1 hour</option>
							<option value="120">2 hours</option>
							<option value="0">Never</option>
						</select>
					</div>

					<div className="toggle-container">
						<span className="toggle-label">Allow Anonymous Data Collection</span>
						<label className="toggle-switch">
							<input type="checkbox" name="dataSharing" checked={securityData.dataSharing} onChange={handleInputChange} />
							<span className="toggle-slider"></span>
						</label>
					</div>
					<p className="settings-help-text">We collect anonymous usage data to improve AirAlert. This does not include any personal information.</p>

					<div className="settings-actions">
						<button type="submit" className="settings-button settings-button-primary" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Security Settings"}
						</button>
					</div>
				</form>
			</div>

			<div className="settings-card">
				<h3 className="settings-section-title">Active Sessions</h3>
				<div className="sessions-list">
					{securityData.activeSessions.length === 0 ? (
						<p>No active sessions found.</p>
					) : (
						securityData.activeSessions.map((session, index) => (
							<div key={index} className="session-item">
								<div className="session-info">
									<p>
										<strong>{session.deviceName}</strong>
										{session.isCurrent && <span className="current-badge">Current</span>}
									</p>
									<p className="session-details">
										{session.location} • {session.browser} • Last active {session.lastActive}
									</p>
								</div>
							</div>
						))
					)}
				</div>

				<div className="settings-actions">
					<button type="button" className="settings-button settings-button-secondary" onClick={handleLogoutAllSessions} disabled={securityData.activeSessions.length <= 1 || isSubmitting}>
						Logout from All Other Devices
					</button>
				</div>
			</div>

			<div className="settings-card">
				<h3 className="settings-section-title">Account Actions</h3>
				<div className="danger-zone">
					<p>Permanently delete your account and all associated data.</p>

					{!confirmDelete ? (
						<button type="button" className="settings-button settings-button-danger" onClick={() => setConfirmDelete(true)}>
							Delete Account
						</button>
					) : (
						<div className="confirm-delete">
							<p className="warning-text">Are you sure? This action cannot be undone.</p>
							<div className="confirm-actions">
								<button
									type="button"
									className="settings-button settings-button-danger"
									onClick={() => {
										/* Handle account deletion */
										onError("Account deletion functionality not implemented");
										setConfirmDelete(false);
									}}
								>
									Yes, Delete My Account
								</button>
								<button type="button" className="settings-button settings-button-secondary" onClick={() => setConfirmDelete(false)}>
									Cancel
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SecuritySettings;

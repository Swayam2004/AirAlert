import React, { useState } from "react";
import API from "../../services/api";

const ProfileSettings = ({ user, onSuccess, onError }) => {
	const [formData, setFormData] = useState({
		name: user?.name || "",
		email: user?.email || "",
		phone: user?.phone || "",
		bio: user?.bio || "",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handlePasswordChange = (e) => {
		const { name, value } = e.target;
		setPasswordData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleProfileSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			await API.updateUserProfile({
				userId: user.id,
				profileData: formData,
			});

			onSuccess("Profile information updated successfully");
		} catch (err) {
			onError(err.message || "Failed to update profile information");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePasswordSubmit = async (e) => {
		e.preventDefault();

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			onError("New passwords don't match");
			return;
		}

		setIsSubmitting(true);

		try {
			await API.updateUserProfile({
				userId: user.id,
				passwordData: {
					currentPassword: passwordData.currentPassword,
					newPassword: passwordData.newPassword,
				},
			});

			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});

			onSuccess("Password changed successfully");
		} catch (err) {
			onError(err.message || "Failed to change password");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="settings-section">
			<div className="settings-card">
				<h3 className="settings-section-title">Personal Information</h3>
				<form onSubmit={handleProfileSubmit}>
					<div className="settings-form-group">
						<label htmlFor="name" className="settings-label">
							Full Name
						</label>
						<input type="text" id="name" name="name" className="settings-input" value={formData.name} onChange={handleInputChange} required />
					</div>

					<div className="settings-form-group">
						<label htmlFor="email" className="settings-label">
							Email Address
						</label>
						<input type="email" id="email" name="email" className="settings-input" value={formData.email} onChange={handleInputChange} required />
					</div>

					<div className="settings-form-group">
						<label htmlFor="phone" className="settings-label">
							Phone Number
						</label>
						<input type="tel" id="phone" name="phone" className="settings-input" value={formData.phone} onChange={handleInputChange} placeholder="Optional" />
					</div>

					<div className="settings-form-group">
						<label htmlFor="bio" className="settings-label">
							About Me
						</label>
						<textarea id="bio" name="bio" rows="3" className="settings-input" value={formData.bio} onChange={handleInputChange} placeholder="Tell us a bit about yourself..." />
					</div>

					<div className="settings-actions">
						<button type="submit" className="settings-button settings-button-primary" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</form>
			</div>

			<div className="settings-card">
				<h3 className="settings-section-title">Change Password</h3>
				<form onSubmit={handlePasswordSubmit}>
					<div className="settings-form-group">
						<label htmlFor="currentPassword" className="settings-label">
							Current Password
						</label>
						<input type="password" id="currentPassword" name="currentPassword" className="settings-input" value={passwordData.currentPassword} onChange={handlePasswordChange} required />
					</div>

					<div className="settings-form-group">
						<label htmlFor="newPassword" className="settings-label">
							New Password
						</label>
						<input type="password" id="newPassword" name="newPassword" className="settings-input" value={passwordData.newPassword} onChange={handlePasswordChange} required minLength="8" />
					</div>

					<div className="settings-form-group">
						<label htmlFor="confirmPassword" className="settings-label">
							Confirm New Password
						</label>
						<input type="password" id="confirmPassword" name="confirmPassword" className="settings-input" value={passwordData.confirmPassword} onChange={handlePasswordChange} required minLength="8" />
					</div>

					<div className="settings-actions">
						<button type="submit" className="settings-button settings-button-primary" disabled={isSubmitting}>
							{isSubmitting ? "Changing..." : "Change Password"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default ProfileSettings;

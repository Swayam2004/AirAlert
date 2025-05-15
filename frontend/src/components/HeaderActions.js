import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationCenter from "./NotificationCenter";

const HeaderActions = ({ openSettingsModal, showSettingsModal, setShowSettingsModal }) => {
	const { user, loading, logout } = useAuth();
	const isAuthenticated = !!user;

	const handleLogout = async () => {
		await logout();
	};

	if (loading) {
		return <div className="loading-indicator">Loading...</div>;
	}

	return (
		<div className="header-actions">
			{isAuthenticated ? (
				<>
					<NotificationCenter userId={user?.id} onSettingsClick={openSettingsModal} />

					<div className="user-profile">
						<div className="user-avatar" onClick={openSettingsModal}>
							{user?.name?.charAt(0) || user?.username?.charAt(0) || "U"}
						</div>
						<div className="user-dropdown">
							<div className="user-info">
								<p className="user-name">{user?.name || user?.username}</p>
								<p className="user-email">{user?.email}</p>
							</div>
							<div className="dropdown-divider"></div>
							<button className="user-settings-btn" onClick={openSettingsModal}>
								Settings
							</button>
							<button className="user-logout-btn" onClick={handleLogout}>
								Logout
							</button>
						</div>
					</div>
				</>
			) : (
				<div className="auth-buttons">
					<Link to="/login" className="btn btn-login">
						Log In
					</Link>
					<Link to="/register" className="btn btn-register">
						Sign Up
					</Link>
				</div>
			)}

			{showSettingsModal && user && (
				<div className="modal">
					<div className="modal-content">
						<div className="modal-header">
							<h2>User Settings</h2>
							<button className="close-button" onClick={() => setShowSettingsModal(false)}>
								&times;
							</button>
						</div>
						<div className="modal-body">
							<UserSettings user={user} onClose={() => setShowSettingsModal(false)} />
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

// Placeholder component - replace with your actual UserSettings component
const UserSettings = ({ user, onClose }) => (
	<div className="user-settings">
		<h3>Account Settings for {user.name}</h3>
		<p>This is a placeholder for the user settings component.</p>
	</div>
);

export default HeaderActions;

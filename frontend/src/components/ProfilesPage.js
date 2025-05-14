import React, { useEffect, useState } from "react";
import API from "../services/api";
import "../styles/index.css";

function ProfilesPage() {
	const [profile, setProfile] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await API.getUserProfile(1); // Replace with dynamic user ID
				setProfile(response.data);
				setLoading(false);
			} catch (err) {
				setError(err.message);
				setLoading(false);
			}
		};

		fetchProfile();
	}, []);

	const handleUpdateProfile = async () => {
		try {
			await API.updateUserProfile(1, profile); // Replace with dynamic user ID
			alert("Profile updated successfully!");
		} catch (err) {
			alert("Failed to update profile: " + err.message);
		}
	};

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<div className="container">
			<header className="mb-5">
				<h1 className="text-primary">User Profile</h1>
				<p className="text-secondary">Manage your account and preferences.</p>
			</header>

			<section className="profile-info">
				<h2 className="text-primary">Personal Information</h2>
				<p>
					Name: <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
				</p>
				<p>
					Email: <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
				</p>
				<button className="btn btn-secondary mt-3" onClick={handleUpdateProfile}>
					Save Changes
				</button>
			</section>

			<section className="preferences mt-5">
				<h2 className="text-primary">Preferences</h2>
				<p>Alert Threshold: AQI &gt; {profile.alertThreshold}</p>
				<button className="btn btn-secondary mt-3">Edit Preferences</button>
			</section>

			<section className="activity-history mt-5">
				<h2 className="text-primary">Activity History</h2>
				<ul>
					{profile.activityHistory.map((activity, index) => (
						<li key={index}>{activity}</li>
					))}
				</ul>
			</section>
		</div>
	);
}

export default ProfilesPage;

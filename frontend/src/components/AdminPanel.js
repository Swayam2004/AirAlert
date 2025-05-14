import React from "react";
import "../styles/index.css";

function AdminPanel() {
	return (
		<div className="container">
			<header className="mb-5">
				<h1 className="text-primary">Admin Panel</h1>
				<p className="text-secondary">Manage monitoring stations, users, and alerts.</p>
			</header>

			<section className="manage-stations">
				<h2 className="text-primary">Monitoring Stations</h2>
				<button className="btn btn-secondary">Add Station</button>
				<ul>
					<li>Station 1 - Location A</li>
					<li>Station 2 - Location B</li>
				</ul>
			</section>

			<section className="manage-users mt-5">
				<h2 className="text-primary">Users</h2>
				<button className="btn btn-secondary">Add User</button>
				<ul>
					<li>John Doe - john.doe@example.com</li>
					<li>Jane Smith - jane.smith@example.com</li>
				</ul>
			</section>

			<section className="manage-alerts mt-5">
				<h2 className="text-primary">Alerts</h2>
				<button className="btn btn-secondary">Add Alert</button>
				<ul>
					<li>AQI &gt; 150 - Notify all users</li>
					<li>AQI &gt; 200 - Notify admins</li>
				</ul>
			</section>
		</div>
	);
}

export default AdminPanel;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "./AdminUserManagement.css";

const AdminUserManagement = () => {
	const { hasRole } = useAuth();
	const [users, setUsers] = useState([]);
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(10);
	const [totalPages, setTotalPages] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [editingUser, setEditingUser] = useState(null);

	// Load users on component mount and when filters change
	useEffect(() => {
		loadUsers();
		loadStats();
	}, [page, limit, roleFilter, statusFilter]);

	// Load users with filters and pagination
	const loadUsers = async () => {
		try {
			setLoading(true);
			setError(null);

			// Build query parameters
			const params = {
				page,
				limit,
				...(searchQuery && { query: searchQuery }),
				...(roleFilter && { role: roleFilter }),
				...(statusFilter !== "" && { is_active: statusFilter === "active" }),
			};

			const response = await axios.get("/api/admin/users", { params });

			setUsers(response.data.items);
			setTotalPages(response.data.pages);
			setError(null);
		} catch (err) {
			console.error("Error fetching users:", err);
			setError("Failed to load users. Please try again later.");
		} finally {
			setLoading(false);
		}
	};

	// Load user statistics
	const loadStats = async () => {
		try {
			const response = await axios.get("/api/admin/users/stats");
			setStats(response.data);
		} catch (err) {
			console.error("Error fetching user stats:", err);
		}
	};

	// Handles search submit
	const handleSearch = (e) => {
		e.preventDefault();
		setPage(1); // Reset to first page
		loadUsers();
	};

	// Handle role change for a user
	const handleRoleChange = async (userId, newRole) => {
		try {
			await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
			// Update local state
			setUsers(users.map((user) => (user.id === userId ? { ...user, role: newRole } : user)));
			loadStats(); // Refresh stats
		} catch (err) {
			console.error("Error updating user role:", err);
			alert("Failed to update user role. Please try again.");
		}
	};

	// Handle status change for a user
	const handleStatusChange = async (userId, isActive) => {
		try {
			await axios.put(`/api/admin/users/${userId}/status`, { is_active: isActive });
			// Update local state
			setUsers(users.map((user) => (user.id === userId ? { ...user, is_active: isActive } : user)));
			loadStats(); // Refresh stats
		} catch (err) {
			console.error("Error updating user status:", err);
			alert("Failed to update user status. Please try again.");
		}
	};

	// Handle delete user
	const handleDeleteUser = async (userId) => {
		if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
			return;
		}

		try {
			await axios.delete(`/api/admin/users/${userId}`);
			// Remove from local state
			setUsers(users.filter((user) => user.id !== userId));
			loadStats(); // Refresh stats
		} catch (err) {
			console.error("Error deleting user:", err);
			alert("Failed to delete user. Please try again.");
		}
	};

	// Handle pagination change
	const handlePageChange = (newPage) => {
		setPage(newPage);
	};

	// Render role selector for a user
	const renderRoleSelector = (user) => {
		// Determine which roles can be selected based on admin's permissions
		const availableRoles = hasRole("superuser") ? ["user", "admin", "superuser"] : ["user", "admin"];

		// Special case: non-superusers can't change role of superusers
		if (user.role === "superuser" && !hasRole("superuser")) {
			return <span className="role-badge role-superuser">Superuser</span>;
		}

		return (
			<select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className={`role-select role-${user.role}`}>
				{availableRoles.map((role) => (
					<option key={role} value={role}>
						{role.charAt(0).toUpperCase() + role.slice(1)}
					</option>
				))}
			</select>
		);
	};

	// Format date in a user-friendly way
	const formatDate = (dateString) => {
		if (!dateString) return "Never";
		const date = new Date(dateString);
		return date.toLocaleString();
	};

	return (
		<div className="admin-user-management">
			<h2 className="section-title">User Management</h2>

			{/* User Statistics Section */}
			{stats && (
				<div className="user-stats">
					<div className="stat-card">
						<div className="stat-value">{stats.total}</div>
						<div className="stat-label">Total Users</div>
					</div>
					<div className="stat-card">
						<div className="stat-value">{stats.active}</div>
						<div className="stat-label">Active Users</div>
					</div>
					<div className="stat-card">
						<div className="stat-value">{stats.inactive}</div>
						<div className="stat-label">Inactive Users</div>
					</div>
					<div className="stat-card">
						<div className="stat-value">{stats.verified}</div>
						<div className="stat-label">Verified Users</div>
					</div>
					<div className="stat-card roles-card">
						<div className="roles-title">Role Distribution</div>
						<div className="roles-container">
							{Object.entries(stats.roles).map(([role, count]) => (
								<div key={role} className="role-stat">
									<div className={`role-indicator role-${role}`}></div>
									<div className="role-name">{role}</div>
									<div className="role-count">{count}</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Search and Filter Section */}
			<div className="filters-container">
				<form onSubmit={handleSearch} className="search-form">
					<input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
					<button type="submit" className="btn btn-primary">
						Search
					</button>
				</form>

				<div className="filter-controls">
					<div className="filter-group">
						<label>Role:</label>
						<select
							value={roleFilter}
							onChange={(e) => {
								setRoleFilter(e.target.value);
								setPage(1);
							}}
							className="filter-select"
						>
							<option value="">All Roles</option>
							<option value="user">User</option>
							<option value="admin">Admin</option>
							<option value="superuser">Superuser</option>
						</select>
					</div>

					<div className="filter-group">
						<label>Status:</label>
						<select
							value={statusFilter}
							onChange={(e) => {
								setStatusFilter(e.target.value);
								setPage(1);
							}}
							className="filter-select"
						>
							<option value="">All Status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
					</div>

					<button
						onClick={() => {
							setSearchQuery("");
							setRoleFilter("");
							setStatusFilter("");
							setPage(1);
							loadUsers();
						}}
						className="btn btn-secondary"
					>
						Clear Filters
					</button>
				</div>
			</div>

			{/* Users Table */}
			{loading ? (
				<div className="loading-indicator">Loading users...</div>
			) : error ? (
				<div className="error-message">{error}</div>
			) : (
				<>
					<div className="users-table-container">
						<table className="users-table">
							<thead>
								<tr>
									<th>ID</th>
									<th>Username</th>
									<th>Email</th>
									<th>Name</th>
									<th>Role</th>
									<th>Status</th>
									<th>Verified</th>
									<th>Created</th>
									<th>Last Login</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{users.map((user) => (
									<tr key={user.id} className={!user.is_active ? "inactive-user" : ""}>
										<td>{user.id}</td>
										<td>{user.username}</td>
										<td>{user.email || "—"}</td>
										<td>{user.name || "—"}</td>
										<td>{renderRoleSelector(user)}</td>
										<td>
											<div className="toggle-container">
												<input type="checkbox" id={`toggle-${user.id}`} checked={user.is_active} onChange={() => handleStatusChange(user.id, !user.is_active)} className="toggle-checkbox" />
												<label htmlFor={`toggle-${user.id}`} className="toggle-label"></label>
												<span className="status-text">{user.is_active ? "Active" : "Inactive"}</span>
											</div>
										</td>
										<td>
											<span className={`verification-status ${user.is_verified ? "verified" : "unverified"}`}>{user.is_verified ? "Yes" : "No"}</span>
										</td>
										<td>{formatDate(user.created_at)}</td>
										<td>{formatDate(user.last_login)}</td>
										<td>
											<button
												onClick={() => handleDeleteUser(user.id)}
												className="btn btn-danger btn-sm"
												disabled={user.id === 1} // Prevent deleting the first user (assumed admin)
											>
												Delete
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="pagination">
							<button onClick={() => handlePageChange(1)} disabled={page === 1} className="pagination-button">
								&laquo;
							</button>

							<button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="pagination-button">
								&lsaquo;
							</button>

							<span className="pagination-info">
								Page {page} of {totalPages}
							</span>

							<button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="pagination-button">
								&rsaquo;
							</button>

							<button onClick={() => handlePageChange(totalPages)} disabled={page >= totalPages} className="pagination-button">
								&raquo;
							</button>

							<select
								value={limit}
								onChange={(e) => {
									setLimit(Number(e.target.value));
									setPage(1);
								}}
								className="limit-select"
							>
								<option value="5">5 per page</option>
								<option value="10">10 per page</option>
								<option value="25">25 per page</option>
								<option value="50">50 per page</option>
								<option value="100">100 per page</option>
							</select>
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default AdminUserManagement;

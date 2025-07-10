import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

// API URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Helper function for auth headers
const authHeader = () => {
	const token = localStorage.getItem("accessToken");
	return token ? { Authorization: `Bearer ${token}` } : {};
};

const UserManagement = () => {
	const [users, setUsers] = useState([]);
	const [filteredUsers, setFilteredUsers] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [searchTerm, setSearchTerm] = useState("");
	const [roleFilter, setRoleFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [sortField, setSortField] = useState("username");
	const [sortDirection, setSortDirection] = useState("asc");
	const [stats, setStats] = useState(null);
	const [selectedUser, setSelectedUser] = useState(null);
	const [modalOpen, setModalOpen] = useState(false);

	const itemsPerPage = 10;
	const { user: currentUser } = useAuth();

	// Fetch users on component mount
	useEffect(() => {
		fetchUsers();
		fetchUserStats();
	}, []);

	// Apply filters when users, search term, or filters change
	useEffect(() => {
		applyFilters();
	}, [users, searchTerm, roleFilter, statusFilter, sortField, sortDirection]);

	// Fetch users from API
	const fetchUsers = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await axios.get(`${API_URL}/api/admin/users`, {
				headers: authHeader(),
			});

			setUsers(response.data);
			setTotalPages(Math.ceil(response.data.length / itemsPerPage));
		} catch (err) {
			console.error("Error fetching users:", err);
			setError("Failed to load users. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch user statistics
	const fetchUserStats = async () => {
		try {
			const response = await axios.get(`${API_URL}/api/admin/users/stats`, {
				headers: authHeader(),
			});

			setStats(response.data);
		} catch (err) {
			console.error("Error fetching user stats:", err);
		}
	};

	// Apply filters and sorting
	const applyFilters = () => {
		let result = [...users];

		// Apply search filter
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			result = result.filter(
				(user) => user.username.toLowerCase().includes(searchLower) || (user.email && user.email.toLowerCase().includes(searchLower)) || (user.name && user.name.toLowerCase().includes(searchLower))
			);
		}

		// Apply role filter
		if (roleFilter) {
			result = result.filter((user) => user.role === roleFilter);
		}

		// Apply status filter
		if (statusFilter !== "") {
			const isActive = statusFilter === "active";
			result = result.filter((user) => user.is_active === isActive);
		}

		// Apply sorting
		result.sort((a, b) => {
			let fieldA = a[sortField];
			let fieldB = b[sortField];

			if (typeof fieldA === "string") {
				fieldA = fieldA.toLowerCase();
			}
			if (typeof fieldB === "string") {
				fieldB = fieldB.toLowerCase();
			}

			// Handle null values
			if (fieldA === null) return sortDirection === "asc" ? -1 : 1;
			if (fieldB === null) return sortDirection === "asc" ? 1 : -1;

			if (fieldA < fieldB) return sortDirection === "asc" ? -1 : 1;
			if (fieldA > fieldB) return sortDirection === "asc" ? 1 : -1;
			return 0;
		});

		setFilteredUsers(result);
		setTotalPages(Math.ceil(result.length / itemsPerPage));

		// Reset to first page if current page is now invalid
		if (currentPage > Math.ceil(result.length / itemsPerPage)) {
			setCurrentPage(1);
		}
	};

	// Handle sort header click
	const handleSort = (field) => {
		const newDirection = field === sortField && sortDirection === "asc" ? "desc" : "asc";
		setSortField(field);
		setSortDirection(newDirection);
	};

	// Calculate current page items
	const getCurrentPageItems = () => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return filteredUsers.slice(startIndex, endIndex);
	};

	// Update user status
	const updateUserStatus = async (userId, isActive) => {
		try {
			await axios.put(`${API_URL}/api/admin/users/${userId}/status`, { is_active: isActive }, { headers: authHeader() });

			// Update local state
			setUsers(users.map((user) => (user.id === userId ? { ...user, is_active: isActive } : user)));

			// Refresh stats
			fetchUserStats();
		} catch (err) {
			console.error("Error updating user status:", err);
			setError("Failed to update user status. Please try again.");
		}
	};

	// Update user role
	const updateUserRole = async (userId, role) => {
		try {
			await axios.put(`${API_URL}/api/admin/users/${userId}/role`, { role }, { headers: authHeader() });

			// Update local state
			setUsers(users.map((user) => (user.id === userId ? { ...user, role } : user)));

			// Refresh stats
			fetchUserStats();
		} catch (err) {
			console.error("Error updating user role:", err);
			setError("Failed to update user role. Please try again.");
		}
	};

	// Open modal with user details
	const openUserModal = (user) => {
		setSelectedUser(user);
		setModalOpen(true);
	};

	// Render pagination controls
	const renderPagination = () => {
		if (totalPages <= 1) return null;

		return (
			<div className="pagination">
				<button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
					&laquo; First
				</button>

				<button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
					&lt; Prev
				</button>

				<span className="pagination-info">
					Page {currentPage} of {totalPages}
				</span>

				<button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
					Next &gt;
				</button>

				<button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
					Last &raquo;
				</button>
			</div>
		);
	};

	// Render user modal
	const renderUserModal = () => {
		if (!modalOpen || !selectedUser) return null;

		return (
			<div className="modal-overlay">
				<div className="modal">
					<div className="modal-header">
						<h2>User Details</h2>
						<button className="close-btn" onClick={() => setModalOpen(false)}>
							&times;
						</button>
					</div>

					<div className="modal-content">
						<div className="user-detail">
							<strong>Username:</strong> {selectedUser.username}
						</div>

						<div className="user-detail">
							<strong>Email:</strong> {selectedUser.email || "N/A"}
							{selectedUser.is_verified ? <span className="verified-badge">Verified</span> : <span className="unverified-badge">Unverified</span>}
						</div>

						<div className="user-detail">
							<strong>Name:</strong> {selectedUser.name || "N/A"}
						</div>

						<div className="user-detail">
							<strong>Role:</strong>
							<select
								value={selectedUser.role}
								onChange={(e) => {
									const newRole = e.target.value;
									// Show confirmation for sensitive role changes
									if ((newRole === "admin" || newRole === "superuser") && selectedUser.role === "user") {
										if (window.confirm(`Are you sure you want to grant ${newRole} privileges to this user?`)) {
											updateUserRole(selectedUser.id, newRole);
											setSelectedUser({ ...selectedUser, role: newRole });
										}
									} else {
										updateUserRole(selectedUser.id, newRole);
										setSelectedUser({ ...selectedUser, role: newRole });
									}
								}}
								disabled={selectedUser.role === "superuser" && currentUser.role !== "superuser"}
							>
								<option value="user">User</option>
								<option value="admin">Admin</option>
								<option value="superuser">Superuser</option>
							</select>
						</div>

						<div className="user-detail">
							<strong>Status:</strong>
							<select
								value={selectedUser.is_active ? "active" : "inactive"}
								onChange={(e) => {
									const isActive = e.target.value === "active";
									updateUserStatus(selectedUser.id, isActive);
									setSelectedUser({ ...selectedUser, is_active: isActive });
								}}
								disabled={selectedUser.role === "superuser" && currentUser.role !== "superuser"}
							>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
							</select>
						</div>

						<div className="user-detail">
							<strong>Created:</strong> {new Date(selectedUser.created_at).toLocaleString()}
						</div>

						<div className="user-detail">
							<strong>Last Login:</strong> {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : "Never"}
						</div>
					</div>

					<div className="modal-actions">
						<button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
							Close
						</button>
					</div>
				</div>
			</div>
		);
	};

	// Render user statistics cards
	const renderStats = () => {
		if (!stats) return null;

		return (
			<div className="stats-cards">
				<div className="stat-card">
					<div className="stat-value">{stats.total_users}</div>
					<div className="stat-label">Total Users</div>
				</div>

				<div className="stat-card">
					<div className="stat-value">{stats.active_users}</div>
					<div className="stat-label">Active Users</div>
				</div>

				<div className="stat-card">
					<div className="stat-value">{stats.verified_users}</div>
					<div className="stat-label">Verified Users</div>
				</div>

				<div className="stat-card">
					<div className="stat-value">{stats.users_by_role?.user || 0}</div>
					<div className="stat-label">Regular Users</div>
				</div>

				<div className="stat-card">
					<div className="stat-value">{(stats.users_by_role?.admin || 0) + (stats.users_by_role?.superuser || 0)}</div>
					<div className="stat-label">Admins</div>
				</div>
			</div>
		);
	};

	return (
		<div className="user-management">
			<h1>User Management</h1>

			{/* User Statistics */}
			{renderStats()}

			{/* Filters Section */}
			<div className="filters-container">
				<div className="search-box">
					<input type="text" placeholder="Search by username, email, or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
				</div>

				<div className="filter-group">
					<select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
						<option value="">All Roles</option>
						<option value="user">User</option>
						<option value="admin">Admin</option>
						<option value="superuser">Superuser</option>
					</select>

					<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
						<option value="">All Status</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>

					<button
						className="btn btn-secondary"
						onClick={() => {
							setSearchTerm("");
							setRoleFilter("");
							setStatusFilter("");
						}}
					>
						Clear Filters
					</button>

					<button
						className="btn btn-primary refresh-btn"
						onClick={() => {
							fetchUsers();
							fetchUserStats();
						}}
					>
						Refresh
					</button>
				</div>
			</div>

			{/* Error Message */}
			{error && <div className="error-message">{error}</div>}

			{/* Users Table */}
			<div className="users-table-container">
				{isLoading ? (
					<div className="loading-spinner">Loading users...</div>
				) : (
					<>
						<table className="users-table">
							<thead>
								<tr>
									<th onClick={() => handleSort("username")} className={sortField === "username" ? sortDirection : ""}>
										Username
									</th>
									<th onClick={() => handleSort("email")} className={sortField === "email" ? sortDirection : ""}>
										Email
									</th>
									<th onClick={() => handleSort("name")} className={sortField === "name" ? sortDirection : ""}>
										Name
									</th>
									<th onClick={() => handleSort("role")} className={sortField === "role" ? sortDirection : ""}>
										Role
									</th>
									<th onClick={() => handleSort("is_active")} className={sortField === "is_active" ? sortDirection : ""}>
										Status
									</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{getCurrentPageItems().map((user) => (
									<tr key={user.id}>
										<td>{user.username}</td>
										<td>
											{user.email || "N/A"}
											{user.is_verified && (
												<span className="verified-icon" title="Email Verified">
													✓
												</span>
											)}
										</td>
										<td>{user.name || "N/A"}</td>
										<td>
											<span className={`role-badge role-${user.role}`}>{user.role}</span>
										</td>
										<td>
											<span className={user.is_active ? "status-active" : "status-inactive"}>{user.is_active ? "Active" : "Inactive"}</span>
										</td>
										<td>
											<button className="btn btn-sm btn-primary" onClick={() => openUserModal(user)}>
												Manage
											</button>
										</td>
									</tr>
								))}

								{filteredUsers.length === 0 && (
									<tr>
										<td colSpan="6" className="no-results">
											No users found matching your filters
										</td>
									</tr>
								)}
							</tbody>
						</table>

						{/* Pagination */}
						{renderPagination()}
					</>
				)}
			</div>

			{/* User Details Modal */}
			{renderUserModal()}
		</div>
	);
};

export default UserManagement;

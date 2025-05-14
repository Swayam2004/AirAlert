import API from "./api";

class AuthService {
	async login(email, password) {
		try {
			const response = await API.login(email, password);
			if (response.data.token) {
				localStorage.setItem("token", response.data.token);
				localStorage.setItem("user", JSON.stringify(response.data.user));
			}
			return response.data;
		} catch (error) {
			throw error;
		}
	}

	logout() {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
	}

	register(name, email, password) {
		return API.register(name, email, password);
	}

	getCurrentUser() {
		const userStr = localStorage.getItem("user");
		if (userStr) return JSON.parse(userStr);
		return null;
	}

	isAuthenticated() {
		return !!localStorage.getItem("token");
	}
}

// Assign instance to a variable before exporting
const instance = new AuthService();

export default instance;

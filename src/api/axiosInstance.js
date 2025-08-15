import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: "https://project-managment-sage.vercel.app",
    // baseURL: "http://localhost:6007",
    withCredentials: true,
});

// Helper function to determine if current user is admin
const isAdminUser = () => {
    return !!localStorage.getItem("accessAdminToken");
};

// Helper function to get appropriate tokens
const getTokens = () => {
    const isAdmin = isAdminUser();
    return {
        accessToken: isAdmin
            ? localStorage.getItem("accessAdminToken")
            : localStorage.getItem("accessToken"),
        refreshToken: isAdmin
            ? localStorage.getItem("refreshAdminToken")
            : localStorage.getItem("refreshToken"),
        isAdmin
    };
};


// Add a request interceptor to include access token
axiosInstance.interceptors.request.use(
    (config) => {
        const { accessToken } = getTokens();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the request fails with 401 (Unauthorized) and it hasn't been retried
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const { refreshToken, isAdmin } = getTokens();

                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }

                // Determine the correct refresh endpoint based on user type
                const refreshEndpoint = isAdmin
                    ? "/admin/refresh-token"
                    : "/user/refresh-token";

                // Request body for refresh token
                const refreshBody = isAdmin
                    ? { refreshAdminToken: refreshToken }
                    : { refreshToken };

                console.log(`Attempting to refresh ${isAdmin ? 'admin' : 'user'} token`);

                // Request a new access token
                const { data } = await axiosInstance.post(
                    refreshEndpoint,
                    refreshBody,
                    { withCredentials: true }
                );

                console.log("Refresh token response:", data);

                // Save new tokens to localStorage based on user type
                if (isAdmin) {
                    localStorage.setItem("accessAdminToken", data.accessAdminToken);
                    localStorage.setItem("refreshAdminToken", data.refreshAdminToken);
                    // Update request with new access token
                    originalRequest.headers.Authorization = `Bearer ${data.accessAdminToken}`;
                } else {
                    localStorage.setItem("accessToken", data.accessToken);
                    localStorage.setItem("refreshToken", data.refreshToken);
                    // Update request with new access token
                    originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                }

                // Retry the original request with the new token
                return axiosInstance(originalRequest);
            } catch (err) {
                console.error("Refresh token failed", err);

                // Clear tokens and redirect to appropriate login page
                const { isAdmin } = getTokens();

                if (isAdmin) {
                    localStorage.removeItem("accessAdminToken");
                    localStorage.removeItem("refreshAdminToken");
                    localStorage.removeItem("roleAdmin");
                    // window.location.href = "/superadminlogin";
                } else {
                    localStorage.removeItem("accessToken");
                    localStorage.removeItem("refreshToken");
                    localStorage.removeItem("role");
                }
                // window.location.href = "/home";
            }
        }

        return Promise.reject(error);
    }
);
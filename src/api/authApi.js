import { axiosInstance } from "./axiosInstance";

// ===================== Authentication APIs =====================

export const signUpUser = async (userData) => {
    const response = await axiosInstance.post("/user/signup", userData);
    return response.data;
};

export const loginUser = async (loginData) => {
    // Get the current URL path
    const currentPath = window.location.pathname;
    // Determine the endpoint based on the path
    const endpoint = currentPath.includes('/superadminlogin')
        ? '/admin/login'
        : '/user/login';

    const response = await axiosInstance.post(endpoint, loginData);
    console.log("Response from (authApi):", response.data);
    return response.data;
};

export const logoutUser = async () => {
    try {
        const currentPath = window.location.pathname;
        const endpoint = currentPath.includes('/superadminlogin')
            ? '/admin/logout'
            : '/user/logout';

        console.log("Endpoint selected:", endpoint);
        const response = await axiosInstance.post(endpoint);
        return response.data;
    } catch (error) {
        console.log("Error from the logout AuthApi.js", error);
        throw error;
    }
};

export const refreshAccessToken = async () => {
    try {
        const response = await axiosInstance.post("/user/refresh-token");
        return response.data;
    } catch (error) {
        console.error("Error refreshing token:", error);
        throw error;
    }
};


// ===================== Company Logo APIs =====================

/**
 * Upload or update company logo
 * @param {File} logoFile - The logo image file to upload
 * @returns {Promise} - Response from the server
 */
export const updateCompanyLogo = async (logoFile) => {
    const formData = new FormData();
    formData.append('logo', logoFile);

    const response = await axiosInstance.put("/user/update-company-logo", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

/**
 * Get company logo by company ID
 * @param {string} companyId - The ID of the company
 * @returns {Promise} - Response containing company logo URL
 */
export const getCompanyLogo = async (companyId) => {
    const response = await axiosInstance.get(`/user/company-logo/${companyId}`);
    return response.data;
};

/**
 * Get the current company's logo (for company users)
 * @returns {Promise} - Response containing company logo URL
 */
export const getMyCompanyLogo = async () => {
    const response = await axiosInstance.get("/user/get-user-data");
    if (response.data.data.role === 'company') {
        return {
            companyLogo: response.data.data.companyLogo,
            companyName: response.data.data.companyName
        };
    } else if (response.data.data.companyId) {
        // For regular users, fetch their company's logo
        return getCompanyLogo(response.data.data.companyId._id);
    }
    return null;
};

// ===================== User Data APIs =====================

export const getUserData = async () => {
    const response = await axiosInstance.get("/user/get-user-data");
    return response.data;
};

export const getUserProfile = async () => {
    const response = await axiosInstance.get("/user/get-profile-data");
    return response.data;
};

export const getTeamUserProfile = async (userId) => {
    const response = await axiosInstance.get(`/user/get-user-data/${userId}`);
    return response.data;
};

export const updateUser = async (userData) => {
    const formData = new FormData();

    // Append all user data fields
    Object.keys(userData).forEach(key => {
        if (userData[key] !== undefined && userData[key] !== null) {
            if (key === 'profilePicture' && userData[key] instanceof File) {
                formData.append('profilePicture', userData[key]);
            } else {
                formData.append(key, userData[key]);
            }
        }
    });

    const response = await axiosInstance.put("/user/update-user", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

// ===================== Company-Specific APIs =====================

export const getCompanyUsers = async () => {
    const response = await axiosInstance.get("/user/get-company-users");
    return response.data;
};

export const promoteUser = async (userData) => {
    const response = await axiosInstance.post("/user/promote-user", userData);
    return response.data;
};

export const getUserPlanDetails = async () => {
    const response = await axiosInstance.get("/user/get-plan-details");
    return response.data;
};

// ===================== Admin APIs =====================

export const getAllData = async () => {
    const response = await axiosInstance.get("/user/get-data");
    return response.data;
};

export const checkExpiredCompanies = async () => {
    const response = await axiosInstance.post("/user/check-expired-companies");
    return response.data;
};

// ===================== PDF Upload APIs =====================

export const uploadPdf = async (pdfFile) => {
    const formData = new FormData();
    formData.append('pdf', pdfFile);

    const response = await axiosInstance.post("/user/upload-pdf", formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getAllPdfs = async () => {
    const response = await axiosInstance.get("/user/get-all-pdfs");
    return response.data;
};

export const deletePdf = async (pdfId) => {
    const response = await axiosInstance.delete(`/user/delete-pdf/${pdfId}`);
    return response.data;
};

// ===================== Testing APIs =====================

export const getTestingData = async () => {
    const response = await axiosInstance.get("/user/testing");
    return response.data;
};

// ===================== Helper Functions =====================

/**
 * Handle API errors consistently
 * @param {Error} error - The error object from axios
 * @returns {Object} - Standardized error object
 */
export const handleApiError = (error) => {
    if (error.response) {
        // Server responded with error status
        return {
            message: error.response.data?.message || error.response.data?.error || 'An error occurred',
            status: error.response.status,
            data: error.response.data
        };
    } else if (error.request) {
        // Network error
        return {
            message: 'Network error. Please check your connection.',
            status: 0,
            data: null
        };
    } else {
        // Something else happened
        return {
            message: error.message || 'An unexpected error occurred',
            status: 0,
            data: null
        };
    }
};

/**
 * Check if user has valid authentication
 * @returns {boolean} - Whether user is authenticated
 */
export const isAuthenticated = () => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    return !!(token && refreshToken);
};

/**
 * Get current user role from localStorage
 * @returns {string|null} - User role or null
 */
export const getCurrentUserRole = () => {
    return localStorage.getItem('role');
};

/**
 * Check if current user is a company
 * @returns {boolean} - Whether user is a company
 */
export const isCompany = () => {
    return getCurrentUserRole() === 'company';
};

/**
 * Check if current user is a regular user
 * @returns {boolean} - Whether user is a regular user
 */
export const isRegularUser = () => {
    return getCurrentUserRole() === 'user';
};

/**
 * Check if current user is a QC Admin
 * @returns {boolean} - Whether user is a QC Admin
 */
export const isQcAdmin = () => {
    return getCurrentUserRole() === 'QcAdmin';
};

/**
 * Check if current user is a super admin
 * @returns {boolean} - Whether user is a super admin
 */
export const isSuperAdmin = () => {
    return getCurrentUserRole() === 'superadmin';
};

/**
 * Clear all authentication data from localStorage
 */
export const clearAuthData = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
};

/**
 * Set authentication data in localStorage
 * @param {Object} authData - Authentication data object
 */
export const setAuthData = (authData) => {
    if (authData.accessToken) {
        localStorage.setItem('accessToken', authData.accessToken);
    }
    if (authData.refreshToken) {
        localStorage.setItem('refreshToken', authData.refreshToken);
    }
    if (authData.user?.role) {
        localStorage.setItem('role', authData.user.role);
    }
};
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    loginUser,
    logoutUser,
} from '../api/authApi';
import { RouteNames } from '../Constants/route';


export const useSuperAdminLogin = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: loginUser,
        onSuccess: (data) => {
            try {
                const token = data?.data?.accessAdminToken;
                const refreshToken = data?.data?.refreshAdminToken;
                const role = data?.data?.admin?.role;

                if (token && refreshToken && role) {
                    localStorage.setItem('accessAdminToken', token);
                    localStorage.setItem('refreshAdminToken', refreshToken);
                    localStorage.setItem('roleAdmin', role);

                    queryClient.invalidateQueries(['superAdminData', role]);
                    if (role === 'superadmin') {
                        navigate(`/${RouteNames.ADMINDASHBOARD}`);
                    }
                } else {
                    console.error('Missing token, refreshToken, or role in response');
                }
            } catch (error) {
                console.error('Error in onSuccess:', error);
            }
        },

        onError: (error) => {
            console.error('(useLogin) Login failed:', error.response?.data || error.message);
        },
    });
};


export const useAdminLogout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: logoutUser,

        onSuccess: () => {
            queryClient.clear();
            localStorage.removeItem('accessAdminToken');
            localStorage.removeItem('refreshAdminToken');
            localStorage.removeItem('roleAdmin');
        },

        onError: (error) => {
            console.error("(useAuth) Logout failed:", error.message || error);
        }
    })
}
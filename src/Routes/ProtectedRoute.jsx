import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { RouteNames } from "../Constants/route";
import PropTypes from "prop-types";

export default function ProtectedRoute({ allowedRoles }) {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const accessToken = localStorage.getItem("accessToken"); // Regular user token
        const accessAdminToken = localStorage.getItem("accessAdminToken"); // Admin token
        const userRole = localStorage.getItem("role");
        const adminRole = localStorage.getItem('roleAdmin');

        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        let isValid = false;

        console.log("accessAdminToken", accessAdminToken);
        console.log("adminRole", adminRole);
        console.log("rolesArray.includes(adminRole)", rolesArray.includes(adminRole));
        console.log("accessToken", accessToken);
        console.log("userRole", userRole);
        console.log("rolesArray.includes(userRole)", rolesArray.includes(userRole));

        // if (accessAdminToken && adminRole && rolesArray.includes(adminRole)) {
        //     isValid = true;
        // } else if (accessToken && userRole && rolesArray.includes(userRole)) {
        //     isValid = true;
        // }
        if (accessAdminToken) {
            isValid = true;
        } else if (accessToken) {
            isValid = true;
        }

        setIsAuthenticated(isValid);

        if (!isValid) {
            // navigate(`/${RouteNames.LOGIN}`, { replace: true });
            navigate(`/home`, { replace: true });
        }
    }, [navigate, allowedRoles]);

    if (isAuthenticated === null) return null;

    return isAuthenticated ? <Outlet /> : null;
}

ProtectedRoute.propTypes = {
    allowedRoles: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.arrayOf(PropTypes.string),
    ]).isRequired,
};

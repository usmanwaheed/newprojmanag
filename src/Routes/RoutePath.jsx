/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { RouteNames } from "../Constants/route";

import Dashboard from '../Pages/Dashboard/Dashboard'
import GetUserPage from "../Pages/Dashboard/AddProjects/Teams/GetUserPage";
import TeamPage from "../Pages/Dashboard/AddProjects/Teams/index";
const Layout = lazy(() => import('../Layout'));
const Home = lazy(() => import('../Pages/Home'));
const LoginPage = lazy(() => import('../Pages/Login'));
const SignUpPage = lazy(() => import('../Pages/Signup'));
const Forms = lazy(() => import('../Pages/Dashboard/Forms'));
const Teams = lazy(() => import('../Pages/Dashboard/Teams'));
const Client = lazy(() => import('../Pages/Dashboard/Client'));
const Message = lazy(() => import('../Pages/Dashboard/Message'));
const Project = lazy(() => import('../Pages/Dashboard/Project'));
const Services = lazy(() => import('../Pages/Dashboard/Services'));
const Invoices = lazy(() => import('../Pages/Dashboard/Invoices'));
const Finances = lazy(() => import('../Pages/Dashboard/Finances'));
const Meetings = lazy(() => import('../Pages/Dashboard/Meetings'));
const Referrals = lazy(() => import('../Pages/Dashboard/Referrals'));
const Contracts = lazy(() => import('../Pages/Dashboard/Contracts'));
const Checkout = lazy(() => import('../Pages/Dashboard/CheckoutPage'));
const AddProjects = lazy(() => import('../Pages/Dashboard/AddProjects'));
const SingleVideo = lazy(() => import('../Pages/Dashboard/AddVideos/SingleVideo'));
const SubDetailsPage = lazy(() => import('../Pages/Dashboard/AddProjects/SubDetailsPage'));
const AdminProfile = lazy(() => import("../Pages/AdminProfilePage/AdminProfile"));
const Subscription = lazy(() => import("../Pages/GetSubscription/Subscription"));
const PaymentSelection = lazy(() => import("../Pages/GetSubscription/PaymentSelection"));
const StripePayment = lazy(() => import("../Pages/GetSubscription/StripePayment"));
const WhopPayment = lazy(() => import("../Pages/GetSubscription/WhopPayment"));
const PaymentSuccess = lazy(() => import("../Pages/GetSubscription/PaymentSuccess"));
const Unauthorized = lazy(() => import("../Pages/GetSubscription/Unauthorized"));

// import SingleVideo from "../Pages/Dashboard/AddVideos/SingleVideo";

// Super Admin Route Part
const AdminLayout = lazy(() => import('../AdminWork'));
const AdminDashboard = lazy(() => import('../AdminWork/pages/Dashboard/Dashboard'));
const CustomerManagment = lazy(() => import('../AdminWork/pages/CustomerManagment/CustomerManagment'));
const NotificationorMessage = lazy(() => import('../AdminWork/pages/Notification&Message/NotificationMessage'));
const PlanManagment = lazy(() => import('../AdminWork/pages/PlanManagment/PlanManagment'));
const TransitionBilling = lazy(() => import('../AdminWork/pages/Transition&Billing/TransitionBilling'));

const SuperAdminLogin = lazy(() => import('../AdminWork/login/SuperAdminLogin'));



// ------------ Admin Routes which are Protected ------------
export const AdminRoute = [
    { path: RouteNames.ADMINLAYOUT, element: AdminLayout, adminLayout: true, title: 'Admin Layout' },
    { path: RouteNames.ADMINDASHBOARD, element: AdminDashboard, adminLayout: true, title: 'Dashboard' },
    { path: RouteNames.CUSTOMERMANAGMENT, element: CustomerManagment, adminLayout: true, title: 'Customer Managment' },
    { path: RouteNames.NOTIFICATIONorMESSAGES, element: NotificationorMessage, adminLayout: true, title: 'Notification & Messages' },
    { path: RouteNames.PLANMANAGMENT, element: PlanManagment, adminLayout: true, title: 'Plan Managment' },
    { path: RouteNames.TRANSITIONorBILLING, element: TransitionBilling, adminLayout: true, title: 'Transition & Billing' },
    // other admin routes
];



// ------------ Public Routes which are not Protected ------------
export const PublicRoute = [
    { path: RouteNames.HOME, element: Home },
    // { path: '/', element: Home },
    { path: RouteNames.LAYOUT, element: Layout },
    { path: RouteNames.LOGIN, element: LoginPage },
    { path: RouteNames.SIGNUP, element: SignUpPage },
    { path: RouteNames.SUPERADMINLOGIN, element: SuperAdminLogin },
    { path: RouteNames.PAYMENTSUCCESS, element: PaymentSuccess },
    { path: RouteNames.UNAUTOHRIZE, element: Unauthorized },
    {
        path: RouteNames.SUBSCRIPTION, element: Subscription, children: [
            {
                path: ":id",
                element: Subscription,
                layout: true,
                title: 'Subscription',
            }
        ]
    },
    {
        path: RouteNames.PAYMENTSELECTION, element: PaymentSelection, children: [
            {
                path: `:id`,
                element: PaymentSelection,
                layout: true,
                title: 'Payment Selection',
            }
        ]
    },
    {
        path: RouteNames.STRIPE, element: StripePayment, children: [
            {
                path: `:id`,
                element: StripePayment,
                layout: true,
                title: 'Stripe',
            }
        ]
    },
    {
        path: RouteNames.WHOP, element: WhopPayment, children: [
            {
                path: `:id`,
                element: WhopPayment,
                layout: true,
                title: 'Whop',
            }
        ]
    },
]



// ------------ Private Routes which are Protected ------------
export const PrivateRoute = [
    { path: RouteNames.DASHBOARD, element: Dashboard, layout: true, title: 'Departments' },
    { path: RouteNames.MESSAGE, element: Message, layout: true, title: 'Message' },

    {
        path: RouteNames.TEAMS, element: Teams, layout: true, title: 'Manage'
    },
    {
        path: RouteNames.TEAMPAGE,
        element: TeamPage,
        layout: true,
        title: 'TeamPage',
        children: [
            {
                path: `${RouteNames.GETUSERPAGE}/:id`,
                element: GetUserPage,
                layout: true,
                title: 'GetUserPage',
            }
        ]
    },
    { path: RouteNames.MEETINGS, element: Meetings, layout: true, title: 'Notifications' },
    { path: RouteNames.SERVICES, element: Services, layout: true, title: 'Services' },
    { path: RouteNames.CONTRACTS, element: Contracts, layout: true, title: 'Contracts' },
    { path: RouteNames.INVOICES, element: Invoices, layout: true, title: 'Invoices' },
    { path: RouteNames.FORMS, element: Forms, layout: true, title: 'Forms' },
    { path: RouteNames.FINANCES, element: Finances, layout: true, title: 'Finances' },
    { path: RouteNames.ADMINPROFILEPAGE, element: AdminProfile, title: 'Profile' },
    // The AddProjects is the children and present inside this Route
    {
        path: RouteNames.CLIENT,
        element: Client,
        layout: true,
        title: 'Client',
        children: [
            { path: `${RouteNames.SINGLEVIDEO}/:id`, element: SingleVideo, layout: true, title: 'Clientt' }
        ]
    },
    {
        path: RouteNames.PROJECT,
        element: Project,
        layout: true,
        title: 'Project',
        children: [
            {
                path: `${RouteNames.ADDPRODUCTS}/:id`,
                element: AddProjects,
                layout: true,
                title: 'AddProjects',
                children: [
                    {
                        path: `${RouteNames.SUBDETAILSPAGE}/:subTaskId`,
                        // path: RouteNames.SUBDETAILSPAGE,
                        element: SubDetailsPage,
                        layout: true,
                        title: 'SubDetailsPage',
                    }
                ]
            }
        ]
    },
    { path: RouteNames.SUBDETAILSPAGE, element: SubDetailsPage, layout: true, title: 'SubDetailsPage' },

    {
        path: RouteNames.REFERRALS,
        element: Referrals,
        layout: true,
        title: 'Referrals',
        children: [
            { path: `${RouteNames.CHECKOUT}`, element: Checkout, layout: true, title: 'Checkout', }
        ]
    },
]
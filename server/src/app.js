/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN.split(","),
        credentials: true,
    })
);
app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());

// For the Stripe
// Stripe CSP Middleware
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        `
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://js.stripe.com;
    connect-src 'self' https://api.stripe.com;
    frame-src https://js.stripe.com https://hooks.stripe.com;
    style-src 'self' 'unsafe-inline';
    object-src 'none';
  `.replace(/\n/g, "")
    ); // Removes newlines for clean output

    next();
});

// Routing of the App Starts Here...
import userRoute from "./routes/userRoute.js";
import adminCreateTask from "./routes/adminCreateTask.js";
import userTracker from "./routes/userTracker.js";
import cloudinaryScreenCapture from "./routes/cloudinaryScreenCapture.js";
import userSubTask from "./routes/userSubTask.js";
import videosPdfSubTask from "./routes/videos&PdfSubTask.js";
import screenRecordingRoutes from "./routes/screenRecordingRoutes.js";
import notificationRoute from "./routes/notificationRoute.js";

import PlanRoute from "./adminPanel/routes/planRoute.js";
import SuperAdminAuth from "./adminPanel/routes/superAdminAuth.js";
import Subscription from "./adminPanel/routes/subscriptionRoute.js";
import chatRoute from "./routes/chat.js";
// import Subscription from "./models/SuperAdmin/Subscriptions.js";

app.use("/user", userRoute);
app.use("/user", adminCreateTask);
app.use("/user", userTracker);
app.use("/user", cloudinaryScreenCapture);
app.use("/user", userSubTask);
app.use("/user", videosPdfSubTask);
app.use("/company", screenRecordingRoutes);
app.use("/notifications", notificationRoute);

app.use("/admin", SuperAdminAuth);
app.use("/superadmin/plans", PlanRoute);
app.use("/superadmin/subscription", Subscription);
app.use("/chat", chatRoute);

app.get("/", (req, res) => {
    res.status(200).send("Working successfull!");
});

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(statusCode).json({
        success: false,
        message,
    });
});

app.use(errorHandler);

export { app };

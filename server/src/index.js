/* eslint-disable no-undef */
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { createServer } from "http";
import { Server } from "socket.io";

const port = process.env.PORT || 6007;

const server = async () => {
    try {
        await connectDB(process.env.MONGO_URI);

        // Create HTTP server
        const httpServer = createServer(app);

        // Setup Socket.IO
        const io = new Server(httpServer, {
            cors: {
                origin: process.env.CORS_ORIGIN.split(","), // match frontend URL
                credentials: true,
            },
        });

        io.on("connection", (socket) => {
            console.log("Socket connected:", socket.id);

            socket.on("disconnect", () => {
                console.log("Socket disconnected:", socket.id);
            });
        });

        httpServer.listen(port, () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } catch (error) {
        console.log("Connection failed at Index.js", error);
    }
};

server();

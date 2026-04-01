import { Server } from "socket.io";
import jwt from "jsonwebtoken"; 
import logger from "../utils/logger.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
            credentials: true
        }
    });

    // --- CUSTOM JWT MIDDLEWARE ---
    io.use(async (socket, next) => {
        try {
            const cookieString = socket.handshake.headers.cookie;
            if (!cookieString) {
                return next(new Error("Authentication error: No cookies provided"));
            }

            // 2. Parse the cookie string manually
            const cookies = cookieString.split('; ').reduce((acc, current) => {
                const [name, ...value] = current.split('=');
                acc[name] = value.join('=');
                return acc;
            }, {});

            // 3. Find the token (checking common names you might have used in auth.controller)
            const token = cookies.token || cookies.jwt;
            if (!token) {
                return next(new Error("Authentication error: Token missing from cookies"));
            }

            // 4. Verify the JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 5. Fetch user using the decoded ID (handling common payload structures)
            const userId = decoded.id || decoded.userId || decoded._id;
            const user = await User.findById(userId).populate('role');

            if (!user) {
                return next(new Error("Authentication error: User not found in database"));
            }

            // 6. Attach the verified user to the socket object!
            socket.dbUser = user;
            next();
        } catch (error) {
            logger.error(`Socket Auth Error: ${error.message}`);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        logger.info(`🔌 Secure Socket Connected: ${socket.dbUser.fullName} (${socket.id})`);

        socket.on("join-project", async (projectId) => {
            try {
                const project = await Project.findById(projectId);
                if (!project) return;

                // Role-Based Security for WebSocket Rooms
                const isAdmin = socket.dbUser.role?.roleName === 'Admin';
                const isManager = project.projectManager.toString() === socket.dbUser._id.toString();
                const isMember = project.assignedTeamMembers.includes(socket.dbUser._id);

                if (isAdmin || isManager || isMember) {
                    socket.join(projectId);
                    logger.info(`✅ ${socket.dbUser.fullName} securely joined Project Room: ${projectId}`);
                } else {
                    logger.warn(`🚨 Intrusion Attempt: ${socket.dbUser.fullName} tried to join unauthorized Project Room: ${projectId}`);
                    socket.emit("error", { message: "You are not authorized to join this project's real-time feed." });
                }

            } catch (error) {
                logger.error(`Socket join error: ${error.message}`);
            }
        });

        socket.on("leave-project", (projectId) => {
            socket.leave(projectId);
            logger.info(`Socket ${socket.id} left Project Room: ${projectId}`);
        });

        // Typing Indicators
        socket.on("typing", (data) => {
            // data ideally has { projectId, taskId, userName }
            if (data.projectId) {
                socket.to(data.projectId).emit("user-typing", data);
            }
        });

        socket.on("stop-typing", (data) => {
            // data ideally has { projectId, taskId, userName }
            if (data.projectId) {
                socket.to(data.projectId).emit("user-stop-typing", data);
            }
        });

        socket.on("disconnect", () => {
            logger.info(`🔴 Socket Disconnected: ${socket.dbUser.fullName} (${socket.id})`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized!");
    }
    return io;
};
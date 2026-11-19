import { Server } from "socket.io";
import jwt from "jsonwebtoken"; 
import logger from "../utils/logger.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import { canAccessProject } from "../utils/projectAccess.js";

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
            const user = await User.findById(userId).select('-password +tokenVersion').populate('role');

            if (!user) {
                return next(new Error("Authentication error: User not found in database"));
            }

            if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
                return next(new Error("Authentication error: Session revoked"));
            }

            // X-03 FIX: Block deactivated users from maintaining WebSocket connections
            if (user.status === 'Inactive') {
                return next(new Error("Authentication error: Account deactivated"));
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

        // Personal room, so revoking a user's sessions can also drop their live connections.
        socket.join(`user:${socket.dbUser._id}`);

        socket.on("join-project", async (projectId) => {
            try {
                // Tenant-scoped lookup: a room in another workspace is refused exactly like one that doesn't exist,
                // so the reply never reveals which project ids exist elsewhere. The server log keeps the attempt.
                const project = await Project.findOne({ _id: projectId, workspace: socket.dbUser.workspace?._id || socket.dbUser.workspace });

                if (project && canAccessProject(project, socket.dbUser)) {
                    socket.join(projectId);
                    logger.info(`${socket.dbUser.fullName} securely joined Project Room: ${projectId}`);
                } else {
                    logger.warn(`Refused join-project: ${socket.dbUser.fullName} (workspace ${socket.dbUser.workspace?._id || socket.dbUser.workspace}) asked for room ${projectId}, which is outside their workspace or their projects`);
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

        // Typing indicators: relay only into rooms this socket was authorized to join (join-project),
        // and take the name from the verified session rather than the client payload.
        const relayTyping = (event) => (data) => {
            const projectId = data?.projectId?.toString();
            if (!projectId || !socket.rooms.has(projectId)) return;
            socket.to(projectId).emit(event, {
                projectId,
                taskId: data.taskId,
                userId: socket.dbUser._id.toString(),
                userName: socket.dbUser.fullName,
            });
        };

        socket.on("typing", relayTyping("user-typing"));
        socket.on("stop-typing", relayTyping("user-stop-typing"));

        socket.on("disconnect", () => {
            logger.info(`Socket Disconnected: ${socket.dbUser.fullName} (${socket.id})`);
        });
    });

    return io;
};

/** Disconnects every live socket of a user (after their sessions were revoked). */
export const disconnectUser = (userId) => {
    io?.in(`user:${userId}`).disconnectSockets(true);
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized!");
    }
    return io;
};
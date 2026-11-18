import { useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';

// VITE_API_URL when set; otherwise same origin in production and the local API in development.
const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : import.meta.env.MODE === "production" ? undefined : "http://localhost:5001";

/**
 * One socket per project. It is created idle, connected while the caller is mounted, and
 * (re)joins the project's room on every connect, so a dropped network doesn't silently stop updates.
 * A new projectId gets a new socket; the previous one is disconnected by the effect cleanup.
 */
export const useSocket = (projectId) => {
    const socket = useMemo(
        () => (projectId ? io(SOCKET_URL, { withCredentials: true, autoConnect: false }) : null),
        [projectId]
    );

    useEffect(() => {
        if (!socket) return undefined;
        const join = () => socket.emit("join-project", projectId);
        socket.on("connect", join);
        socket.connect();

        return () => {
            socket.emit("leave-project", projectId);
            socket.off("connect", join);
            socket.disconnect();
        };
    }, [socket, projectId]);

    return socket;
};

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (projectId) => {
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!projectId) return;

        // Disconnect any existing socket before creating a new one to prevent
        // multiple live connections when projectId changes rapidly (BUG #11).
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        // Use VITE_API_URL if available, otherwise default to local
        const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
        
        const newSocket = io(SOCKET_URL, {
            withCredentials: true,
        });

        newSocket.on("connect", () => {
            newSocket.emit("join-project", projectId);
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        return () => {
            newSocket.emit("leave-project", projectId);
            newSocket.disconnect();
            socketRef.current = null;
        };
    }, [projectId]);

    return socket;
};
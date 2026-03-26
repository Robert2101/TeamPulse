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

        const newSocket = io("http://localhost:5001", {
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
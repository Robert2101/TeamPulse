import axios from "axios";

// Determine base URL depending on environment
const baseURL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : import.meta.env.MODE === "production" ? "/api" : "http://localhost:5001/api";

const api = axios.create({
    baseURL,
    withCredentials: true, 
});

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            import('../store/useStore').then(({ useStore }) => {
                useStore.getState().logout();
                window.location.href = '/login';
            });
        }
        return Promise.reject(err);
    }
);

export default api;
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
        // Session expired: clear local state and send the user to sign in once (no loop on public pages).
        const onPublicPage = ['/', '/login', '/register'].includes(window.location.pathname);
        if (err.response?.status === 401 && !onPublicPage) {
            import('../store/useStore').then(({ useStore }) => {
                useStore.setState({ user: null, projects: [], projectsLoaded: false });
                window.location.href = '/login?expired=1';
            });
        }
        return Promise.reject(err);
    }
);

export default api;
import axios from "axios";

// Determine base URL depending on environment
const baseURL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : "http://localhost:5001/api";

const api = axios.create({
    baseURL,
    withCredentials: true, 
});

export default api;
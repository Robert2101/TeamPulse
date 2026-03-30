import { create } from 'zustand';
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : "http://localhost:5001/api";

axios.defaults.baseURL = baseURL;
axios.defaults.withCredentials = true;

export const useStore = create((set) => ({
    user: null,
    isAuthChecking: true,
    projects: [],

    checkAuth: async () => {
        try {
            const res = await axios.get('/auth/check-auth');
            set({ user: res.data.user, isAuthChecking: false });
        } catch (error) {
            set({ user: null, isAuthChecking: false });
        }
    },

    login: async (credentials) => {
        const res = await axios.post('/auth/login', credentials);
        set({ user: res.data.user });
    },

    logout: async () => {
        await axios.post('/auth/logout');
        set({ user: null });
    },

    setProjects: (projects) => set({ projects }),
    addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
    removeProject: (projectId) => set((state) => ({ projects: state.projects.filter(p => p._id !== projectId) })),
    updateProjectInStore: (updatedProject) => set((state) => ({ projects: state.projects.map(p => p._id === updatedProject._id ? updatedProject : p) })),

    updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}));
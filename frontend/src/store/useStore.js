import { create } from 'zustand';
import axios from 'axios';
import { setCsrfToken, withCsrf } from '../lib/csrf';

const baseURL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : import.meta.env.MODE === "production" ? "/api" : "http://localhost:5001/api";

axios.defaults.baseURL = baseURL;
axios.defaults.withCredentials = true;
withCsrf(axios);

const signedOut = { user: null, projects: [], projectsLoaded: false, pulse: null };

export const useStore = create((set) => ({
    user: null,
    isAuthChecking: true,
    projects: [],
    projectsLoaded: false,
    pulse: null, // { days: [...14 ISO dates], byProject: { [projectId]: number[] } }
    commandOpen: false,
    // Bumped when the signed-in person changes without a reload (demo persona switch), to remount pages.
    sessionKey: 0,

    checkAuth: async () => {
        try {
            const res = await axios.get('/auth/check-auth');
            set({ user: res.data.user, isAuthChecking: false });
        } catch {
            setCsrfToken(null);
            set({ ...signedOut, isAuthChecking: false });
        }
    },

    login: async (credentials) => {
        const res = await axios.post('/auth/login', credentials);
        set({ ...signedOut, user: res.data.user });
    },

    // Creates a private demo workspace and signs in as the chosen persona (admin, manager, member, stakeholder).
    startDemo: async (persona) => {
        const res = await axios.post('/demo/start', { persona });
        set({ ...signedOut, user: res.data.user });
        return res.data.user;
    },

    // Signs in as another persona of the same demo workspace.
    switchPersona: async (persona) => {
        const res = await axios.post('/demo/switch', { persona });
        set((state) => ({ ...signedOut, user: res.data.user, sessionKey: state.sessionKey + 1 }));
        return res.data.user;
    },

    // Always clear the local session, even if the network call fails, so the user is never stuck "logged in".
    logout: async () => {
        try {
            await axios.post('/auth/logout');
        } catch (error) {
            console.error("Logout request failed", error);
        } finally {
            setCsrfToken(null);
            set(signedOut);
        }
    },

    setCommandOpen: (commandOpen) => set({ commandOpen }),
    setPulse: (pulse) => set({ pulse }),
    setProjects: (projects) => set({ projects, projectsLoaded: true }),
    addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),
    removeProject: (projectId) => set((state) => ({ projects: state.projects.filter(p => p._id !== projectId) })),
    updateProjectInStore: (updatedProject) => set((state) => ({ projects: state.projects.map(p => p._id === updatedProject._id ? updatedProject : p) })),

    updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}));

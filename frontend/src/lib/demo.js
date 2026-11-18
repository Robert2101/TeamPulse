// Seeded sample accounts (backend/seed.js). Set VITE_DEMO_ACCOUNTS=false to hide them.
export const DEMO_PASSWORD = "password123";
export const demoEnabled = import.meta.env.VITE_DEMO_ACCOUNTS !== "false";

export const DEMO_ACCOUNTS = [
    { name: "Tony Stark", email: "tony@stark.com", role: "Admin", workspace: "Stark Industries", sees: "Every project, members and roles, the audit log." },
    { name: "Pepper Potts", email: "pepper@stark.com", role: "Project Manager", workspace: "Stark Industries", sees: "Runs two projects: plans, assigns and reviews work." },
    { name: "Peter Parker", email: "peter@stark.com", role: "Team Member", workspace: "Stark Industries", sees: "Moves his tasks, comments and attaches files." },
    { name: "Bruce Wayne", email: "bruce@wayne.com", role: "Admin", workspace: "Wayne Enterprises", sees: "A separate company: none of Stark's data is visible." },
];

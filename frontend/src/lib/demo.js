// The four people a visitor can be in a demo workspace. Keys match PERSONAS in backend/demo/template.js.
export const demoEnabled = import.meta.env.VITE_DEMO_ACCOUNTS !== "false";

export const DEMO_COMPANY = "Fernway";

export const DEMO_PERSONAS = [
    { persona: "admin", name: "Maya Chen", role: "Admin", title: "Head of Product", sees: "Every project, the team and their roles, and the audit log." },
    { persona: "manager", name: "Daniel Okafor", role: "Project Manager", title: "Product Manager, Mobile", sees: "Runs the mobile app launch: plans, assigns and reviews work." },
    { persona: "member", name: "Lucas Moreau", role: "Team Member", title: "iOS Engineer", sees: "Works his tasks, one of them overdue: moves cards, comments, attaches files." },
    { persona: "stakeholder", name: "Grace Liu", role: "Stakeholder", title: "Partnerships, Skyline Air", sees: "A partner following the Partner API: reads and discusses, can't change work." },
];

export const personaFor = (user) => DEMO_PERSONAS.find((p) => p.persona === user?.demoPersona);

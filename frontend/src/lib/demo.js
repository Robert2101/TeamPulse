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

// What each role is allowed to do on a board, exactly as the API enforces it.
export const PREVIEW_ROLES = [
    { id: "admin", label: "Admin", canCreate: true, canManage: true, canMove: true, audit: true, note: "Every project, plus members, roles and the audit log." },
    { id: "manager", label: "Project manager", canCreate: true, canManage: true, canMove: true, audit: true, note: "Plans and assigns the work on the projects they run." },
    { id: "member", label: "Team member", canCreate: true, canManage: false, canMove: true, audit: false, note: "Moves their tasks, comments and attaches files." },
    { id: "stakeholder", label: "Stakeholder", canCreate: false, canManage: false, canMove: false, audit: false, note: "Follows progress and joins the discussion, without changing work." },
];

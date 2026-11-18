/** String id of an ObjectId, a string id, or a populated document (null when missing). */
export const idOf = (value) => (value?._id ?? value)?.toString() ?? null;

const isAdmin = (user) => user?.role?.roleName === 'Admin';

/** Admins and the project's manager can change the project and everything in it. */
export const canManageProject = (project, user) =>
    Boolean(project && user) && (isAdmin(user) || idOf(project.projectManager) === idOf(user._id));

/** Managers plus the project's assigned members can see and work inside the project. */
export const canAccessProject = (project, user) =>
    canManageProject(project, user) ||
    Boolean(user && project?.assignedTeamMembers?.some((member) => idOf(member) === idOf(user._id)));

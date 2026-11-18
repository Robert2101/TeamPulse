import Role from '../models/role.model.js';

// The four roles every workspace uses. Permissions are checked by requirePermission(flag).
export const ROLE_DEFINITIONS = [
    { roleName: 'Admin', accessLevel: 'Admin', manageProjects: true, manageTasks: true, manageTeamMembers: true, viewReports: true },
    { roleName: 'Project Manager', accessLevel: 'Editor', manageProjects: true, manageTasks: true, manageTeamMembers: true, viewReports: true },
    { roleName: 'Team Member', accessLevel: 'Editor', manageProjects: false, manageTasks: true, manageTeamMembers: false, viewReports: true },
    { roleName: 'Stakeholder', accessLevel: 'Viewer', manageProjects: false, manageTasks: false, manageTeamMembers: false, viewReports: true },
];

/** Creates any missing role (idempotent), so an empty database is usable without running the seed. */
export const ensureRoles = async () => {
    await Role.bulkWrite(ROLE_DEFINITIONS.map((role) => ({
        updateOne: { filter: { roleName: role.roleName }, update: { $setOnInsert: role }, upsert: true },
    })));
    const roles = await Role.find({ roleName: { $in: ROLE_DEFINITIONS.map((r) => r.roleName) } }).lean();
    return Object.fromEntries(roles.map((r) => [r.roleName, r]));
};

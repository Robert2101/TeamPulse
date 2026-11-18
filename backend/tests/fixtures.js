import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Role from '../models/role.model.js';
import Workspace from '../models/workspace.model.js';
import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import Comment from '../models/comment.model.js';

export const PASSWORD = 'password123';

const ROLES = [
    { roleName: 'Admin', accessLevel: 'Admin', manageProjects: true, manageTasks: true, manageTeamMembers: true, viewReports: true },
    { roleName: 'Project Manager', accessLevel: 'Editor', manageProjects: true, manageTasks: true, manageTeamMembers: true, viewReports: true },
    { roleName: 'Team Member', accessLevel: 'Editor', manageProjects: false, manageTasks: true, manageTeamMembers: false, viewReports: true },
    { roleName: 'Stakeholder', accessLevel: 'Viewer', manageProjects: false, manageTasks: false, manageTeamMembers: false, viewReports: true },
];

/**
 * Wipes the test database and seeds two workspaces:
 *  - Acme: admin, pm, member (on the project), outsider (Team Member, not on the project), stakeholder
 *  - Beta: admin, member
 * Each workspace has one project with one task (assigned to its member) and one comment.
 */
export const seed = async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));

    const roles = Object.fromEntries((await Role.insertMany(ROLES)).map((r) => [r.roleName, r]));
    const password = await bcrypt.hash(PASSWORD, 4);
    const ids = () => new mongoose.Types.ObjectId();

    const acmeId = ids();
    const betaId = ids();
    const userDefs = {
        admin: ['Ada Admin', 'admin@acme.test', 'Admin', acmeId],
        pm: ['Pam Manager', 'pm@acme.test', 'Project Manager', acmeId],
        member: ['Max Member', 'member@acme.test', 'Team Member', acmeId],
        outsider: ['Otto Outsider', 'outsider@acme.test', 'Team Member', acmeId],
        stakeholder: ['Sue Stakeholder', 'stakeholder@acme.test', 'Stakeholder', acmeId],
        betaAdmin: ['Bob Beta', 'admin@beta.test', 'Admin', betaId],
        betaMember: ['Bea Beta', 'member@beta.test', 'Team Member', betaId],
    };
    const users = {};
    for (const [key, [fullName, emailAddress, roleName, workspace]] of Object.entries(userDefs)) {
        users[key] = await User.create({ fullName, emailAddress, password, role: roles[roleName]._id, workspace });
    }

    const acme = await Workspace.create({ _id: acmeId, workspaceName: 'Acme', owner: users.admin._id, inviteCode: 'ACME01' });
    const beta = await Workspace.create({ _id: betaId, workspaceName: 'Beta', owner: users.betaAdmin._id, inviteCode: 'BETA01' });

    const project = await Project.create({
        projectName: 'Acme Launch', workspace: acmeId, projectManager: users.pm._id,
        createdBy: users.pm._id, assignedTeamMembers: [users.member._id], budget: 5000,
    });
    const betaProject = await Project.create({
        projectName: 'Beta Launch', workspace: betaId, projectManager: users.betaAdmin._id,
        createdBy: users.betaAdmin._id, assignedTeamMembers: [users.betaMember._id], budget: 9000,
    });

    const task = await Task.create({
        taskName: 'Write copy', projectReference: project._id, workspace: acmeId,
        assignee: users.member._id, createdBy: users.pm._id,
    });
    const betaTask = await Task.create({
        taskName: 'Beta task', projectReference: betaProject._id, workspace: betaId,
        assignee: users.betaMember._id, createdBy: users.betaAdmin._id,
    });

    const comment = await Comment.create({ commentContent: 'First!', author: users.member._id, task: task._id, workspace: acmeId });
    const betaComment = await Comment.create({ commentContent: 'Beta note', author: users.betaMember._id, task: betaTask._id, workspace: betaId });
    await Task.updateOne({ _id: task._id }, { $push: { comments: comment._id } });
    await Task.updateOne({ _id: betaTask._id }, { $push: { comments: betaComment._id } });

    return { roles, users, acme, beta, project, betaProject, task, betaTask, comment, betaComment };
};

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Import your models
import Role from './models/role.model.js';
import User from './models/user.model.js';
import Workspace from './models/workspace.model.js';
import Project from './models/project.model.js';
import Task from './models/task.model.js';
import Comment from './models/comment.model.js';
import Activity from './models/activity.model.js';

dotenv.config();

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🔌 Connected to MongoDB. Preparing Epic Multi-Tenant Seeding Protocol...");

        // 1. CLEAN THE DATABASE
        await Role.deleteMany({});
        await Workspace.deleteMany({});
        await User.deleteMany({});
        await Project.deleteMany({});
        await Task.deleteMany({});
        await Comment.deleteMany({});
        await Activity.deleteMany({});
        console.log("🧹 Database wiped clean.");

        // 2. CREATE THE ROLES
        const rolesData = [
            { roleName: 'Admin', accessLevel: 'Admin', manageProjects: true, manageTasks: true, manageTeamMembers: true, viewReports: true },
            { roleName: 'Project Manager', accessLevel: 'Editor', manageProjects: true, manageTasks: true, manageTeamMembers: true, viewReports: true },
            { roleName: 'Team Member', accessLevel: 'Editor', manageProjects: false, manageTasks: true, manageTeamMembers: false, viewReports: true },
            { roleName: 'Stakeholder', accessLevel: 'Viewer', manageProjects: false, manageTasks: false, manageTeamMembers: false, viewReports: true }
        ];

        const createdRoles = await Role.insertMany(rolesData);
        const getRole = (name) => createdRoles.find(r => r.roleName === name)._id;
        console.log("🛡️ Roles forged.");

        // 3. CREATE THE WORKSPACE (The Tenant)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const adminId = new mongoose.Types.ObjectId();
        
        const mainWorkspace = await Workspace.create({
            workspaceName: 'Stark Industries',
            inviteCode: 'STARKX',
            owner: adminId
        });
        const wId = mainWorkspace._id;
        console.log("🏢 Workspace 'Stark Industries' Built.");

        // 4. CREATE 10 USERS UNDER THIS WORKSPACE
        const adminUser = await User.create({
            _id: adminId,
            fullName: 'Tony Stark',
            emailAddress: 'tony@stark.com',
            password: hashedPassword,
            role: getRole('Admin'),
            workspace: wId,
            status: 'Active'
        });

        const pms = await User.insertMany([
            { fullName: 'Pepper Potts', emailAddress: 'pepper@stark.com', password: hashedPassword, role: getRole('Project Manager'), workspace: wId, status: 'Active' },
            { fullName: 'James Rhodes', emailAddress: 'rhodey@stark.com', password: hashedPassword, role: getRole('Project Manager'), workspace: wId, status: 'Active' }
        ]);

        const devs = await User.insertMany([
            { fullName: 'Peter Parker', emailAddress: 'peter@stark.com', password: hashedPassword, role: getRole('Team Member'), workspace: wId, status: 'Active' },
            { fullName: 'Bruce Banner', emailAddress: 'bruce@stark.com', password: hashedPassword, role: getRole('Team Member'), workspace: wId, status: 'Active' },
            { fullName: 'Natasha Romanoff', emailAddress: 'natasha@stark.com', password: hashedPassword, role: getRole('Team Member'), workspace: wId, status: 'Active' },
            { fullName: 'Clint Barton', emailAddress: 'clint@stark.com', password: hashedPassword, role: getRole('Team Member'), workspace: wId, status: 'Active' },
            { fullName: 'Thor Odinson', emailAddress: 'thor@stark.com', password: hashedPassword, role: getRole('Team Member'), workspace: wId, status: 'Active' },
            { fullName: 'Wanda Maximoff', emailAddress: 'wanda@stark.com', password: hashedPassword, role: getRole('Team Member'), workspace: wId, status: 'Active' },
            { fullName: 'Sam Wilson', emailAddress: 'sam@stark.com', password: hashedPassword, role: getRole('Team Member'), workspace: wId, status: 'Active' }
        ]);

        const allUsers = [adminUser, ...pms, ...devs];
        console.log(`👥 Created ${allUsers.length} Employees for Stark Industries.`);

        // 5. CREATE MASSIVE PROJECTS
        const projectsData = [
            {
                projectName: 'Mark 85 Armor Refinement',
                projectDescription: 'Upgrading the nanotech capacity for rapid deployment into outer space environments.',
                clientName: 'S.H.I.E.L.D.',
                projectManager: pms[0]._id, // Pepper
                createdBy: adminId,
                budget: 15000000,
                priority: 'Critical',
                projectStatus: 'Active',
                projectType: 'Design',
                startDate: new Date(Date.now() - 30 * 86400000), // 30 days ago
                endDate: new Date(Date.now() + 60 * 86400000),
                assignedTeamMembers: [devs[0]._id, devs[1]._id], // Peter, Bruce
                workspace: wId
            },
            {
                projectName: 'Avengers Compound Renewal',
                projectDescription: 'Rebuilding the training facilities, living quarters, and stealth hangars.',
                clientName: 'The Avengers',
                projectManager: pms[1]._id, // Rhodey
                createdBy: adminId,
                budget: 50000000,
                priority: 'High',
                projectStatus: 'Planning',
                projectType: 'Construction',
                startDate: new Date(),
                endDate: new Date(Date.now() + 180 * 86400000),
                assignedTeamMembers: [devs[2]._id, devs[3]._id, devs[6]._id], // Natasha, Clint, Sam
                workspace: wId
            },
            {
                projectName: 'Arc Reactor Clean Output',
                projectDescription: 'Scaling miniature arc reactor tech for massive city grid integration.',
                clientName: 'New York City',
                projectManager: pms[0]._id, // Pepper
                createdBy: adminId,
                budget: 120000000,
                priority: 'Medium',
                projectStatus: 'Completed',
                projectType: 'Research',
                startDate: new Date(Date.now() - 200 * 86400000), // 200 days ago
                endDate: new Date(Date.now() - 10 * 86400000), // 10 days ago
                assignedTeamMembers: [devs[1]._id, devs[5]._id], // Bruce, Wanda
                workspace: wId
            },
            {
                projectName: 'Ultron Countermeasures',
                projectDescription: 'Developing automated firewalls against rogue AI variables attempting takeover.',
                clientName: 'Global Defense',
                projectManager: pms[1]._id, // Rhodey
                createdBy: adminId,
                budget: 7500000,
                priority: 'Critical',
                projectStatus: 'On Hold',
                projectType: 'Development',
                startDate: new Date(Date.now() - 15 * 86400000),
                endDate: new Date(Date.now() + 90 * 86400000),
                assignedTeamMembers: [devs[0]._id, devs[1]._id, devs[4]._id], // Peter, Bruce, Thor
                workspace: wId
            }
        ];

        const insertedProjects = await Project.insertMany(projectsData);
        console.log(`🚀 Launched ${insertedProjects.length} Epic Projects.`);

        // Add back references to users for projects assigned
        for (let proj of insertedProjects) {
            await User.updateMany(
                { _id: { $in: proj.assignedTeamMembers } },
                { $push: { assignedProjects: proj._id } }
            );
        }

        // 6. TASKS, DISCUSSIONS AND HISTORY
        // Each task has a real brief, a short thread, and the same audit trail the app writes
        // (created -> moved -> commented), spread over the last few days.
        const [pepper, rhodey] = pms;
        const [peter, bruce, natasha, clint, thor, wanda, sam] = devs;
        const [armor, compound, reactor, ultron] = insertedProjects;
        const HOUR = 3600000;
        const at = (hoursAgo) => new Date(Date.now() - hoursAgo * HOUR);

        const tasksData = [
            {
                taskName: 'Nanobot storage algorithm', project: armor, manager: pepper, assignee: peter, due: 5, status: 'In-Progress', prio: 'High', createdHoursAgo: 120,
                description: 'Rework how the suit packs dormant nanobots between deployments. The current layout wastes about a fifth of the housing.\n\nDone when:\n- full deployment from storage takes under 2 seconds\n- the new layout passes the cold-vacuum bench test',
                thread: [
                    [pepper, 'Can we have a first benchmark before Friday\'s review?', 30],
                    [peter, 'Yes. The prototype already packs 12% tighter. Posting bench numbers tomorrow morning.', 26],
                ],
            },
            {
                taskName: 'HUD layout for combat mode', project: armor, manager: pepper, assignee: peter, due: 15, status: 'To-Do', prio: 'Medium', createdHoursAgo: 96,
                description: 'Pilots say combat mode shows too much at once. Group the readouts by urgency and keep the centre of view clear.\n\nStart from the pilot feedback in the last flight debrief.',
                thread: [[adminUser, 'Keep the threat indicator where it is. Muscle memory matters more than symmetry.', 50]],
            },
            {
                taskName: 'Gamma signature masking', project: armor, manager: pepper, assignee: bruce, due: -2, status: 'Done', prio: 'Urgent', createdHoursAgo: 240,
                description: 'Mask the suit\'s gamma signature so long-range scanners can\'t track it.\n\nVerify against the full scanner suite before closing.',
                thread: [
                    [bruce, 'Masking holds at full output on every scanner in the suite. Moving this to Done.', 60],
                    [pepper, 'Great work. I\'ll note it in this week\'s client report.', 58],
                ],
            },
            {
                taskName: 'Thruster output test', project: armor, manager: pepper, assignee: pepper, due: 2, status: 'Review', prio: 'High', createdHoursAgo: 72,
                description: 'Run the thruster test at 70%, 85% and 100% output and record heat drift at each step.\n\nNeeds Tony\'s sign-off before the next test flight.',
                thread: [
                    [pepper, 'Results are in. Heat drift is within tolerance at 85% and slightly over at 100%.', 20],
                    [adminUser, 'Over at 100% is acceptable for now. Approve it with a note for the next revision.', 6],
                ],
            },
            {
                taskName: 'Finalize compound blueprints', project: compound, manager: rhodey, assignee: rhodey, due: 0, status: 'Review', prio: 'Urgent', createdHoursAgo: 160,
                description: 'Final blueprints for the training wing, living quarters and hangars. Contractors start the week after approval.',
                thread: [
                    [natasha, 'Hangar 2 still shows the old door width.', 40],
                    [rhodey, 'Fixed in revision 7. Can you check it again?', 34],
                    [natasha, 'Looks right now.', 12],
                ],
            },
            {
                taskName: 'Reinforce the east wing', project: compound, manager: rhodey, assignee: natasha, due: 30, status: 'To-Do', prio: 'High', createdHoursAgo: 150,
                description: 'Reinforce the east wing walls for the new hangar. Schedule the work after the blueprints are approved.',
                thread: [],
            },
            {
                taskName: 'Moving targets on the archery range', project: compound, manager: rhodey, assignee: clint, due: 20, status: 'In-Progress', prio: 'Medium', createdHoursAgo: 140,
                description: 'Install a track system for moving targets on the outdoor range. Targets must be controllable from the range tablet.',
                thread: [[clint, 'Track is in. Wiring the controller next.', 18]],
            },
            {
                taskName: 'Flight simulator yearly check', project: compound, manager: rhodey, assignee: sam, due: 10, status: 'To-Do', prio: 'Low', createdHoursAgo: 130,
                description: 'Yearly check of the flight simulator: recalibrate the motion base, inspect the harness and update the software.',
                thread: [],
            },
            {
                taskName: 'Isotope synthesis', project: reactor, manager: pepper, assignee: bruce, due: -30, status: 'Done', prio: 'Urgent', createdHoursAgo: 900,
                description: 'Synthesise the stable isotope for the grid-scale reactor core.',
                thread: [[bruce, 'Batch three is stable. Handing over to integration.', 760]],
            },
            {
                taskName: 'Containment shielding', project: reactor, manager: pepper, assignee: wanda, due: -20, status: 'Done', prio: 'High', createdHoursAgo: 880,
                description: 'Design the containment shielding for the reactor housing and verify it under peak load.',
                thread: [[wanda, 'Shielding held at 140% of peak load in the final run.', 500]],
            },
            {
                taskName: 'Anomaly detection model', project: ultron, manager: rhodey, assignee: peter, due: 60, status: 'In-Progress', prio: 'Urgent', createdHoursAgo: 300,
                description: 'Train a model that flags unusual behaviour in autonomous systems before it spreads across the network.',
                thread: [[rhodey, 'The project is on hold until legal clears data access. Please stop at a clean checkpoint.', 90]],
            },
            {
                taskName: 'Firewall integrity audit', project: ultron, manager: rhodey, assignee: thor, due: 45, status: 'To-Do', prio: 'Medium', createdHoursAgo: 290,
                description: 'Audit the perimeter firewall rules and list every rule that allows outbound traffic without an owner.',
                thread: [],
            },
        ];

        const activities = [];
        let commentCount = 0;
        for (const t of tasksData) {
            const task = await Task.create({
                taskName: t.taskName,
                taskDescription: t.description,
                projectReference: t.project._id,
                workspace: wId,
                assignee: t.assignee._id,
                dueDate: new Date(Date.now() + t.due * 86400000),
                priority: t.prio,
                taskStatus: t.status,
                completedAt: t.status === 'Done' ? at(Math.max(t.createdHoursAgo / 4, 2)) : undefined,
                createdBy: t.manager._id,
                createdAt: at(t.createdHoursAgo),
            });
            const projectId = t.project._id.toString();
            activities.push({ user: t.manager._id, action: 'Created Task', entityType: 'Task', entityId: task._id, workspace: wId, createdAt: at(t.createdHoursAgo), metadata: { taskName: t.taskName, projectId } });
            if (t.status !== 'To-Do') {
                activities.push({ user: t.assignee._id, action: `Updated Task to ${t.status}`, entityType: 'Task', entityId: task._id, workspace: wId, createdAt: at(t.createdHoursAgo / 2), metadata: { taskName: t.taskName, previousStatus: 'To-Do', newStatus: t.status, projectId } });
            }
            for (const [author, text, hoursAgo] of t.thread) {
                const comment = await Comment.create({ commentContent: text, author: author._id, task: task._id, workspace: wId, createdAt: at(hoursAgo) });
                await Task.updateOne({ _id: task._id }, { $push: { comments: comment._id } });
                activities.push({ user: author._id, action: 'Added Comment', entityType: 'Comment', entityId: comment._id, workspace: wId, createdAt: at(hoursAgo), metadata: { taskId: task._id, taskName: t.taskName, projectId } });
                commentCount += 1;
            }
        }
        console.log(`📋 Created ${tasksData.length} tasks with ${commentCount} comments.`);

        activities.push({ user: adminId, action: 'Created Workspace', entityType: 'User', entityId: adminId, workspace: wId, createdAt: at(1000), metadata: {} });
        await Activity.insertMany(activities);

        console.log("📝 Activity history written.");

        // =========================================================
        // TENANT 2: WAYNE ENTERPRISES
        // =========================================================
        const wayneAdminId = new mongoose.Types.ObjectId();
        const wayneWorkspace = await Workspace.create({
            workspaceName: 'Wayne Enterprises',
            inviteCode: 'BATMAN',
            owner: wayneAdminId
        });
        const wayneWId = wayneWorkspace._id;
        console.log("🏢 Workspace 'Wayne Enterprises' Built.");

        const bruceWayne = await User.create({
            _id: wayneAdminId,
            fullName: 'Bruce Wayne',
            emailAddress: 'bruce@wayne.com',
            password: hashedPassword,
            role: getRole('Admin'),
            workspace: wayneWId,
            status: 'Active'
        });

        const dickGrayson = await User.create({
            fullName: 'Dick Grayson',
            emailAddress: 'dick@wayne.com',
            password: hashedPassword,
            role: getRole('Team Member'),
            workspace: wayneWId,
            status: 'Active'
        });

        const wayneProject = await Project.create({
            projectName: 'Batcave Sonar Grid',
            projectDescription: 'Mapping Gotham underground with high-frequency sonar ping systems.',
            clientName: 'Confidential',
            projectManager: bruceWayne._id,
            createdBy: bruceWayne._id,
            budget: 500000000,
            priority: 'Critical',
            projectStatus: 'Active',
            projectType: 'Research',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 86400000),
            assignedTeamMembers: [dickGrayson._id],
            workspace: wayneWId
        });

        await User.updateMany(
            { _id: dickGrayson._id },
            { $push: { assignedProjects: wayneProject._id } }
        );

        await Task.create({
            taskName: 'Calibrate Sonar Transmitters',
            taskDescription: 'Ensure frequency matches local bat population without causing distress.',
            projectReference: wayneProject._id,
            workspace: wayneWId,
            assignee: dickGrayson._id,
            dueDate: new Date(Date.now() + 7 * 86400000),
            priority: 'High',
            taskStatus: 'To-Do',
            createdBy: bruceWayne._id
        });

        await Activity.create({
            user: bruceWayne._id,
            action: 'Created Workspace',
            entityType: 'User',
            entityId: bruceWayne._id,
            workspace: wayneWId,
            metadata: {}
        });

        console.log("🦇 Wayne Enterprises tenant seeded successfully.");

        console.log("\n=============================================");
        console.log("🌟 EPIC MULTI-TENANT SEEDING COMPLETE! 🎉");
        console.log("=============================================");
        console.log("🔥 Everything is perfectly scoped to their respective tenants");
        console.log(`🏢 Invite Code Stark:   STARKX`);
        console.log(`🦇 Invite Code Wayne:   BATMAN\n`);
        console.log("LOGIN CHEAT-SHEET (All Passwords are 'password123'):");
        console.log(`   👑 Admin:       tony@stark.com`);
        console.log(`   🛠️ Dev:         peter@stark.com`);
        console.log(`   🦇 Wayne Admin: bruce@wayne.com`);
        console.log(`   🦸 Wayne Dev:   dick@wayne.com`);
        console.log("=============================================\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed dramatically:", error);
        process.exit(1);
    }
};

seedDatabase();
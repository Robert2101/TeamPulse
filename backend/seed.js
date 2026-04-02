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

        // 6. CREATE REALISTIC TASKS SPREAD EVERYWHERE
        const tasksData = [
            // Project 1 (Armor - PM: Pepper)
            { taskName: 'Nanobot Storage Algorithm', projectReference: insertedProjects[0]._id, assignee: devs[0]._id, due: 5, status: 'In-Progress', prio: 'High' },
            { taskName: 'HUD UI Redesign', projectReference: insertedProjects[0]._id, assignee: devs[0]._id, due: 15, status: 'To-Do', prio: 'Medium' },
            { taskName: 'Gamma Signature Masking', projectReference: insertedProjects[0]._id, assignee: devs[1]._id, due: -2, status: 'Done', prio: 'Urgent' },
            { taskName: 'Thruster Output Test', projectReference: insertedProjects[0]._id, assignee: pms[0]._id, due: 2, status: 'Review', prio: 'High' },

            // Project 2 (Compound - PM: Rhodey)
            { taskName: 'Blueprint Finalization', projectReference: insertedProjects[1]._id, assignee: pms[1]._id, due: 0, status: 'Review', prio: 'Urgent' },
            { taskName: 'Stealth Wing Reinforcement', projectReference: insertedProjects[1]._id, assignee: devs[2]._id, due: 30, status: 'To-Do', prio: 'High' },
            { taskName: 'Archery Range Moving Targets', projectReference: insertedProjects[1]._id, assignee: devs[3]._id, due: 20, status: 'In-Progress', prio: 'Medium' },
            { taskName: 'Flight Simulator Check', projectReference: insertedProjects[1]._id, assignee: devs[6]._id, due: 10, status: 'To-Do', prio: 'Low' },

            // Project 3 (Arc Reactor - Completed)
            { taskName: 'Isotope Synthesis', projectReference: insertedProjects[2]._id, assignee: devs[1]._id, due: -30, status: 'Done', prio: 'Urgent' },
            { taskName: 'Chaos Magic Shielding', projectReference: insertedProjects[2]._id, assignee: devs[5]._id, due: -20, status: 'Done', prio: 'High' },

            // Project 4 (Ultron - On Hold)
            { taskName: 'AI Pattern Recognition', projectReference: insertedProjects[3]._id, assignee: devs[0]._id, due: 60, status: 'In-Progress', prio: 'Urgent' },
            { taskName: 'Asgardian Firewall Integrity', projectReference: insertedProjects[3]._id, assignee: devs[4]._id, due: 45, status: 'To-Do', prio: 'Medium' }
        ];

        const generatedTasks = [];
        for (let t of tasksData) {
            generatedTasks.push(await Task.create({
                taskName: t.taskName,
                taskDescription: `Action item: Needs immediate completion for ${t.taskName}. Please refer to the engineering manual for specifications.`,
                projectReference: t.projectReference,
                workspace: wId,
                assignee: t.assignee,
                dueDate: new Date(Date.now() + (t.due * 86400000)),
                priority: t.prio,
                taskStatus: t.status,
                createdBy: adminId
            }));
        }
        console.log(`📋 Pushed ${generatedTasks.length} Action Tasks into the Grid.`);

        // 7. SPREAD ACTIVITIES & COMMENTS
        for (let task of generatedTasks) {
            await Comment.create({
                commentContent: `Taking a heavy look at this task: ${task.taskName}. Will update shortly!`,
                author: task.assignee || adminId,
                task: task._id,
                workspace: wId
            });

            await Activity.create({
                user: task.assignee || adminId,
                action: 'Updated Status',
                entityType: 'Task',
                entityId: task._id,
                workspace: wId,
                metadata: { oldStatus: 'To-Do', newStatus: task.taskStatus }
            });
        }
        
        await Activity.create({
            user: adminId,
            action: 'Created Workspace',
            entityType: 'User',
            entityId: adminId,
            workspace: wId,
            metadata: { detail: 'Tony created the Stark Industries workspace environment.' }
        });

        console.log("📝 Flushed Activity streams & Team Comments successfully.");

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
            metadata: { detail: 'Bruce created the Wayne Enterprises hidden environment.' }
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
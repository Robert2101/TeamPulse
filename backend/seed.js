import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Import your models
import Role from './models/role.model.js';
import User from './models/user.model.js';
import Project from './models/project.model.js';
import Task from './models/task.model.js';
import Comment from './models/comment.model.js';

dotenv.config();

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("🔌 Connected to MongoDB for Epic Seeding...");

        // 1. ANNIHILATE THE OLD DATA (Clean Slate)
        await Role.deleteMany({});
        await User.deleteMany({});
        await Project.deleteMany({});
        await Task.deleteMany({});
        await Comment.deleteMany({});
        console.log("🧹 Database cleared.");

        // 2. CREATE BLUEPRINT ROLES 
        const rolesData = [
            {
                roleName: 'Admin',
                accessLevel: 'Admin',
                manageProjects: true,
                manageTasks: true,
                manageTeamMembers: true,
                viewReports: true
            },
            {
                roleName: 'Project Manager',
                accessLevel: 'Editor',
                manageProjects: true,
                manageTasks: true,
                manageTeamMembers: true,
                viewReports: true
            },
            {
                roleName: 'Team Member',
                accessLevel: 'Editor',
                manageProjects: false,
                manageTasks: true,
                manageTeamMembers: false,
                viewReports: true
            },
            {
                roleName: 'Stakeholder',
                accessLevel: 'Viewer',
                manageProjects: false,
                manageTasks: false,
                manageTeamMembers: false,
                viewReports: true
            }
        ];

        const createdRoles = await Role.insertMany(rolesData);
        const getRole = (name) => createdRoles.find(r => r.roleName === name)._id;
        console.log("🛡️ Roles forged in the database.");

        // 3. CREATE PERSONAS (USERS)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const admin = await User.create({
            fullName: 'System Admin',
            emailAddress: 'admin@teampulse.com',
            password: hashedPassword,
            role: getRole('Admin'),
            status: 'Active'
        });

        const pm = await User.create({
            fullName: 'Sarah (Project Manager)',
            emailAddress: 'sarah@teampulse.com',
            password: hashedPassword,
            role: getRole('Project Manager'),
            status: 'Active'
        });

        const dev = await User.create({
            fullName: 'Alex (Team Member)',
            emailAddress: 'alex@teampulse.com',
            password: hashedPassword,
            role: getRole('Team Member'),
            status: 'Active'
        });

        const stakeholder = await User.create({
            fullName: 'Mr. Investor',
            emailAddress: 'money@teampulse.com',
            password: hashedPassword,
            role: getRole('Stakeholder'),
            status: 'Active'
        });
        console.log("👥 Users created (All passwords are 'password123').");

        // 4. CREATE A MASTER PROJECT
        const masterProject = await Project.create({
            projectName: 'TeamPulse V2 Launch',
            projectDescription: 'Migrating from Clerk to Custom JWT and implementing Framer Motion UI.',
            projectManager: pm._id,
            createdBy: admin._id,
            budget: 25000,
            priority: 'High',
            projectStatus: 'Active',
            startDate: new Date(),
            assignedTeamMembers: [dev._id, stakeholder._id] // Alex and the Investor are in!
        });

        // Add project reference back to users
        await User.updateMany(
            { _id: { $in: [pm._id, dev._id, stakeholder._id] } },
            { $push: { assignedProjects: masterProject._id } }
        );
        console.log("🚀 Master Project launched.");

        // 5. CREATE KANBAN TASKS
        const task1 = await Task.create({
            taskName: 'Design Database Schema',
            taskDescription: 'Map out the MongoDB collections for Projects, Tasks, and Roles.',
            projectReference: masterProject._id,
            assignee: pm._id,
            dueDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
            priority: 'Urgent',
            taskStatus: 'Done',
            createdBy: pm._id
        });

        const task2 = await Task.create({
            taskName: 'Implement JWT Auth',
            taskDescription: 'Remove Clerk and setup secure httpOnly cookies.',
            projectReference: masterProject._id,
            assignee: dev._id,
            dueDate: new Date(Date.now() + 86400000 * 5), // 5 days from now
            priority: 'High',
            taskStatus: 'In-Progress',
            createdBy: pm._id
        });

        const task3 = await Task.create({
            taskName: 'Stakeholder Review',
            taskDescription: 'Present the new dashboard charts to the board.',
            projectReference: masterProject._id,
            assignee: stakeholder._id,
            dueDate: new Date(Date.now() + 86400000 * 10), // 10 days from now
            priority: 'Medium',
            taskStatus: 'To-Do',
            createdBy: admin._id
        });

        // 6. SPRINKLE SOME COMMENTS
        await Comment.create({
            commentContent: 'Great job on the schema design!',
            author: admin._id,
            task: task1._id
        });

        await Comment.create({
            commentContent: 'I am hitting a 401 error on the axios interceptor, looking into it now.',
            author: dev._id,
            task: task2._id
        });

        console.log("✅ Tasks and Comments generated.");
        console.log("🎉 EPIC SEED COMPLETE. YOU MAY NOW TEST THE FINAL BOSS LEVEL.");
        process.exit();

    } catch (error) {
        console.error("❌ Seeding failed dramatically:", error);
        process.exit(1);
    }
};

seedDatabase();
import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({

    roleName: {
        type: String,
        required: true,
        unique: true,
        enum: ['Admin', 'Project Manager', 'Team Member', 'Stakeholder', 'Chatbot User']
    },

    accessLevel: {
        type: String,
        enum: ['Admin', 'Editor', 'Viewer'],
        default: 'Viewer'
    },

    roleDescription: {
        type: String,
        trim: true
    },

    manageProjects: { type: Boolean, default: false },
    manageTasks: { type: Boolean, default: false },
    manageTeamMembers: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: true },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, { timestamps: true });

export default mongoose.model('Role', roleSchema);
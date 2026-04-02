import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({

    projectName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        required: false
    },

    projectDescription: {
        type: String,
        trim: true
    },

    projectManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    budget: {
        type: Number,
        default: 0
    },

    clientName: {
        type: String,
        trim: true
    },

    startDate: {
        type: Date
    },

    endDate: {
        type: Date
    },

    priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Medium"
    },

    projectStatus: {
        type: String,
        enum: ["Planning", "Active", "On Hold", "Completed", "Cancelled"],
        default: "Planning"
    },

    projectType: {
        type: String,
        trim: true
    },

    assignedTeamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    assets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileAsset"
    }]

}, { timestamps: true });

export default mongoose.model("Project", projectSchema);
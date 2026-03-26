import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({

    taskName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    taskDescription: {
        type: String,
        trim: true
    },

    projectReference: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true
    },

    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },

    dueDate: {
        type: Date
    },

    priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Urgent"],
        default: "Medium"
    },

    taskStatus: {
        type: String,
        enum: ["To-Do", "In-Progress", "Review", "Done"],
        default: "To-Do",
        index: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    completedAt: {
        type: Date
    },

    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }],

    attachments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileAsset"
    }]

}, { timestamps: true });

export default mongoose.model("Task", taskSchema);
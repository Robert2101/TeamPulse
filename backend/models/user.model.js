import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

    fullName: {
        type: String,
        required: true,
        trim: true
    },

    emailAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },

    password: {
        type: String,
        required: true,
    },

    phoneNumber: {
        type: String,
        trim: true
    },

    profilePicture: {
        type: String  
    },

    joiningDate: {
        type: Date,
        default: Date.now
    },

    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    },

    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        required: false // Optional initially to allow for seamless transition
    },

    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        required: true
    },


    assignedProjects: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    }],

    tasksAssigned: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
    }],

    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }],

    isVerified: {
        type: Boolean,
        default: false
    },

    lastLogin: {
        type: Date
    }

}, {
    timestamps: true
});

export default mongoose.model("User", userSchema);
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({

    commentContent: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
        required: true,
        index: true
    },

    attachments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "FileAsset"
    }],

    edited: {
        type: Boolean,
        default: false
    },

    editTimestamp: {
        type: Date
    },

    pinned: {
        type: Boolean,
        default: false
    },

    visibleTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],

    workspace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace"
    }

}, { timestamps: true });

commentSchema.index({ task: 1, createdAt: 1 });

export default mongoose.model("Comment", commentSchema);
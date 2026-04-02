import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema({
    workspaceName: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    inviteCode: {
        type: String,
        unique: true,
        default: () => Math.random().toString(36).substring(2, 8).toUpperCase()
    }
}, { timestamps: true });

const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;

import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true 
    },
    action: {
        type: String,
        required: true,
        trim: true 
    },
    entityType: {
        type: String,
        enum: ["Project", "Task", "Comment", "User"],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true 
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed 
    }
}, { timestamps: true });

export default mongoose.model("Activity", activitySchema);
import mongoose from "mongoose";

const chatbotInteractionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    query: {
        type: String,
        required: true,
        trim: true
    },
    classifiedIntent: {
        type: String,
        enum: ["task_query", "project_update", "reminder", "navigation", "general"],
        default: "general"
    },
    responseGenerated: {
        type: String,
        required: true
    },
    relatedProject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project"
    },
    relatedTask: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task"
    }
}, { timestamps: true });

export default mongoose.model("ChatbotInteraction", chatbotInteractionSchema);
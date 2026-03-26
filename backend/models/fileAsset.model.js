import mongoose from "mongoose";

const fileAssetSchema = new mongoose.Schema({

    url: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    fileType: {
        type: String,
        required: true
    },

    size: {
        type: Number,
        required: true
    },

    cloudinaryId: {
        type: String,
        required: true
    },

    // Cloudinary resource type ('image', 'video', 'raw') – used for accurate deletion
    cloudinaryResourceType: {
        type: String,
        enum: ['image', 'video', 'raw'],
        default: 'raw'
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    // Polymorphic reference to the entity this file belongs to
    entityType: {
        type: String,
        enum: ["Task", "Comment", "User", "Project"],
        required: true
    },

    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    }

}, { timestamps: true });

export default mongoose.model("FileAsset", fileAssetSchema);

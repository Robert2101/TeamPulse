import crypto from "node:crypto";
import mongoose from "mongoose";

// No 0/O or 1/I, so codes survive being read aloud or typed from a screenshot.
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_LENGTH = 8;

/** Cryptographically random invite code (32^8 ≈ 1.1 trillion possibilities). */
export const generateInviteCode = () =>
    Array.from({ length: INVITE_LENGTH }, () => INVITE_ALPHABET[crypto.randomInt(INVITE_ALPHABET.length)]).join("");

const workspaceSchema = new mongoose.Schema({
    // Not unique: unrelated companies may share a name, and signup shouldn't reveal which names exist.
    workspaceName: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    inviteCode: {
        type: String,
        unique: true,
        default: generateInviteCode
    }
}, { timestamps: true });

const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;

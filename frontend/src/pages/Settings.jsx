import { useState, useRef } from "react";
import { useStore } from "../store/useStore";
import { User, Mail, Shield, Camera, CheckCircle, AlertCircle } from "lucide-react";
import api from "../lib/axios";

export const Settings = () => {
    const { user, updateUser } = useStore();
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error'
    const fileInputRef = useRef(null);

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadStatus(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('entityType', 'User');
            formData.append('entityId', user._id);

            const res = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update the local user state with the new profile picture URL
            updateUser({ profilePicture: res.data.file.url });
            setUploadStatus('success');
        } catch (err) {
            console.error("Failed to upload profile picture", err);
            setUploadStatus('error');
        } finally {
            setUploading(false);
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Account Settings</h2>
                <p className="mt-2 text-zinc-400">Manage your profile and preferences.</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 pb-8 border-b border-zinc-800">
                    {/* Avatar with upload overlay */}
                    <div className="relative shrink-0">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 overflow-hidden">
                            {user?.profilePicture ? (
                                <img
                                    src={user.profilePicture}
                                    alt={user.fullName}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <User size={40} />
                            )}
                        </div>

                        {/* Camera overlay button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-950 bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                            title="Upload profile picture"
                        >
                            {uploading ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Camera size={14} />
                            )}
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold text-white">{user?.fullName}</h3>
                        <p className="text-zinc-400 flex items-center gap-2 mt-2">
                            <Mail size={16} /> {user?.emailAddress}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-3">
                            <span className="text-indigo-400 flex items-center gap-1.5 bg-indigo-500/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                <Shield size={14} /> {user?.role?.roleName || "Team Member"}
                            </span>
                            <span className="text-green-400 flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                Active Status
                            </span>
                        </div>

                        {/* Upload feedback */}
                        {uploadStatus === 'success' && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-green-400">
                                <CheckCircle size={13} /> Profile picture updated successfully.
                            </p>
                        )}
                        {uploadStatus === 'error' && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
                                <AlertCircle size={13} /> Failed to upload. Please try again.
                            </p>
                        )}
                        <p className="mt-2 text-xs text-zinc-500">Click the camera icon to update your profile picture.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Security & Preferences</h4>
                    <p className="text-sm text-zinc-400">Password management and role modifications are handled by your Administrator via the Pega Blueprint interface.</p>
                </div>
            </div>
        </div>
    );
};

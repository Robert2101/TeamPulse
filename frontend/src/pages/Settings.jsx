import { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { User, Mail, Shield, Camera, CheckCircle, AlertCircle, Users, Loader2 } from "lucide-react";
import api from "../lib/axios";

export const Settings = () => {
    const { user, updateUser } = useStore();
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error'
    const [workspaceUsers, setWorkspaceUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const fileInputRef = useRef(null);

    // Fetch workspace users if the user is an Admin
    useEffect(() => {
        if (user?.role?.roleName === 'Admin') {
            const fetchUsers = async () => {
                setLoadingUsers(true);
                try {
                    const res = await api.get('/auth/workspace/users');
                    setWorkspaceUsers(res.data);
                } catch (err) {
                    console.error("Failed to fetch workspace users", err);
                } finally {
                    setLoadingUsers(false);
                }
            };
            fetchUsers();
        }
    }, [user?.role?.roleName]);

    const handleRoleChange = async (targetUserId, newRoleName) => {
        try {
            await api.put(`/auth/workspace/users/${targetUserId}/role`, { roleName: newRoleName });
            
            // Update local state to reflect change immediately
            setWorkspaceUsers(prev => prev.map(u => 
                u._id === targetUserId 
                  ? { ...u, role: { ...u.role, roleName: newRoleName } } 
                  : u
            ));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update role");
        }
    };

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
                    <div className="space-y-4 mt-8 pb-4">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Workspace Details</h4>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h5 className="font-bold text-white text-lg">{user?.workspace?.workspaceName}</h5>
                                {user?.role?.roleName === 'Admin' ? (
                                    <p className="text-sm text-zinc-400">Share this invite code with developers so they can join your workspace.</p>
                                ) : (
                                    <p className="text-sm text-zinc-400">You are a member of this workspace.</p>
                                )}
                            </div>

                            {user?.role?.roleName === 'Admin' && (
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Invite Code</span>
                                    <div className="group relative flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-6 py-3 transition-colors hover:border-indigo-500/50">
                                        <span className="font-mono text-2xl font-bold tracking-[0.25em] text-indigo-400">
                                            {user?.workspace?.inviteCode || '------'}
                                        </span>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(user?.workspace?.inviteCode)}
                                            className="text-indigo-400 opacity-50 transition-opacity hover:opacity-100"
                                            title="Copy to clipboard"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
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

            </div>

            {/* --- ADMIN USER MANAGEMENT PANEL --- */}
            {user?.role?.roleName === 'Admin' && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 shadow-xl mt-8">
                    <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
                        <Users className="text-indigo-400" size={24} />
                        <div>
                            <h3 className="text-xl font-bold text-white">User Management</h3>
                            <p className="text-sm text-zinc-400">Upgrade or modify permissions for members in your workspace.</p>
                        </div>
                    </div>

                    {loadingUsers ? (
                        <div className="flex justify-center p-8 text-indigo-400"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="space-y-4">
                            {workspaceUsers.map((member) => (
                                <div key={member._id} className="flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
                                            {member.profilePicture ? (
                                                <img src={member.profilePicture} alt={member.fullName} className="h-full w-full object-cover" />
                                            ) : (
                                                member.fullName[0].toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{member.fullName}</p>
                                            <p className="text-xs text-zinc-500">{member.emailAddress}</p>
                                        </div>
                                    </div>

                                    {/* Role Management Dropdown */}
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Role</span>
                                        <select
                                            disabled={member._id === user._id}
                                            value={member.role?.roleName}
                                            onChange={(e) => handleRoleChange(member._id, e.target.value)}
                                            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                                        >
                                            <option value="Admin">Admin</option>
                                            <option value="Project Manager">Project Manager</option>
                                            <option value="Team Member">Team Member</option>
                                            <option value="Stakeholder">Stakeholder</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

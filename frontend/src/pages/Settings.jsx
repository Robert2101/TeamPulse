import { useState, useRef, useEffect } from "react";
import { useStore } from "../store/useStore";
import { Mail, Phone, Shield, Camera, CheckCircle2, AlertCircle, Loader2, Pencil, Copy, Check } from "lucide-react";
import api from "../lib/axios";
import { Avatar } from "../components/ui/avatar";
import { btn, card, field, label } from "../lib/styles";
import { formatDate, errorMessage } from "../lib/format";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";

const ROLES = ["Admin", "Project Manager", "Team Member", "Stakeholder"];

const Section = ({ title, description, children, className }) => (
    <section className={cn(card, "p-5 sm:p-8", className)}>
        <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
        </div>
        {children}
    </section>
);

const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { console.error(e); }
        document.body.removeChild(textArea);
        return ok;
    }
};

export const Settings = () => {
    const { user, updateUser } = useStore();
    const isAdmin = user?.role?.roleName === 'Admin';
    const [uploading, setUploading] = useState(false);
    const [workspaceUsers, setWorkspaceUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState(false);
    const [savingUserId, setSavingUserId] = useState(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileData, setProfileData] = useState({ fullName: "", emailAddress: "", phoneNumber: "", password: "" });

    // Fetch workspace users if the user is an Admin
    useEffect(() => {
        if (!isAdmin) return;
        const fetchUsers = async () => {
            setLoadingUsers(true);
            setUsersError(false);
            try {
                const res = await api.get('/auth/workspace/users');
                setWorkspaceUsers(res.data);
            } catch (err) {
                console.error("Failed to fetch workspace users", err);
                setUsersError(true);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, [isAdmin]);

    const startEditing = () => {
        setProfileData({ fullName: user?.fullName || "", emailAddress: user?.emailAddress || "", phoneNumber: user?.phoneNumber || "", password: "" });
        setProfileError("");
        setIsEditingProfile(true);
    };

    // Optimistic admin updates with rollback on failure.
    const updateMember = async (targetUserId, patch, request, successMsg) => {
        const previous = workspaceUsers;
        setWorkspaceUsers(prev => prev.map(u => (u._id === targetUserId ? { ...u, ...patch(u) } : u)));
        setSavingUserId(targetUserId);
        try {
            await request();
            toast.success(successMsg);
        } catch (err) {
            setWorkspaceUsers(previous);
            toast.error("Change not saved", errorMessage(err));
        } finally {
            setSavingUserId(null);
        }
    };

    const handleRoleChange = (member, newRoleName) =>
        updateMember(
            member._id,
            (u) => ({ role: { ...u.role, roleName: newRoleName } }),
            () => api.put(`/auth/workspace/users/${member._id}/role`, { roleName: newRoleName }),
            `${member.fullName || "Member"} is now ${newRoleName}`
        );

    const handleStatusChange = (member, newStatus) =>
        updateMember(
            member._id,
            () => ({ status: newStatus }),
            () => api.put(`/auth/workspace/users/${member._id}/status`, { status: newStatus }),
            `${member.fullName || "Member"} ${newStatus === "Inactive" ? "deactivated" : "reactivated"}`
        );

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("That's not an image", "Choose a JPG, PNG, GIF or WebP file.");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            toast.error("Image too large", "Profile pictures must be under 50 MB.");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('entityType', 'User');
            formData.append('entityId', user._id);

            const res = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            updateUser({ profilePicture: res.data.file.url });
            toast.success("Profile picture updated");
        } catch (err) {
            console.error("Failed to upload profile picture", err);
            toast.error("Upload failed", errorMessage(err, "Your picture couldn't be uploaded. Please try again."));
        } finally {
            setUploading(false);
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileError("");
        try {
            const payload = { ...profileData, fullName: profileData.fullName.trim(), emailAddress: profileData.emailAddress.trim() };
            if (!payload.password) delete payload.password;
            const res = await api.put('/auth/profile', payload);
            updateUser(res.data.user);
            setIsEditingProfile(false);
            setProfileData(d => ({ ...d, password: "" }));
            toast.success("Profile saved");
        } catch (err) {
            setProfileError(errorMessage(err, "Couldn't save your profile. Please try again."));
        } finally {
            setProfileLoading(false);
        }
    };

    const handleCopyInvite = async () => {
        const ok = await copyText(user?.workspace?.inviteCode || "");
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            toast.error("Couldn't copy", "Select the code and copy it manually.");
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-12">
            <div className="border-b border-gray-200 pb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Settings</h1>
                <p className="mt-2 text-gray-600">Your profile, your workspace, and who can do what.</p>
            </div>

            {/* --- PROFILE --- */}
            <Section title="Profile">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                    {/* Avatar with upload button */}
                    <div className="relative shrink-0 self-start">
                        <Avatar name={user?.fullName} src={user?.profilePicture} size="xl" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-[0_2px_6px_rgba(15,23,42,0.12)] transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-70"
                            aria-label={uploading ? "Uploading profile picture" : "Change profile picture"}
                        >
                            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} tabIndex={-1} aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                        {isEditingProfile ? (
                            <form onSubmit={handleProfileUpdate} className="w-full max-w-md space-y-4">
                                {profileError && (
                                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {profileError}
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="profile-name" className={label}>Full name</label>
                                    <input id="profile-name" required maxLength={80} autoComplete="name" className={field} value={profileData.fullName} onChange={e => setProfileData({ ...profileData, fullName: e.target.value })} />
                                </div>
                                <div>
                                    <label htmlFor="profile-email" className={label}>Email</label>
                                    <input id="profile-email" type="email" required autoComplete="email" className={field} value={profileData.emailAddress} onChange={e => setProfileData({ ...profileData, emailAddress: e.target.value })} />
                                </div>
                                <div>
                                    <label htmlFor="profile-phone" className={label}>Phone number <span className="font-normal text-gray-500">(optional)</span></label>
                                    <input id="profile-phone" type="tel" autoComplete="tel" className={field} value={profileData.phoneNumber} onChange={e => setProfileData({ ...profileData, phoneNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label htmlFor="profile-password" className={label}>New password <span className="font-normal text-gray-500">(optional)</span></label>
                                    <input id="profile-password" type="password" autoComplete="new-password" placeholder="Leave blank to keep your current password" className={field} value={profileData.password} onChange={e => setProfileData({ ...profileData, password: e.target.value })} />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="submit" disabled={profileLoading} className={btn.primary}>
                                        {profileLoading ? <><Loader2 className="animate-spin" size={16} aria-hidden="true" /> Saving…</> : "Save changes"}
                                    </button>
                                    <button type="button" onClick={() => setIsEditingProfile(false)} className={btn.ghost}>Cancel</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <h3 className="min-w-0 text-xl font-semibold text-gray-900 wrap-anywhere">{user?.fullName}</h3>
                                    <button onClick={startEditing} className={btn.secondary}>
                                        <Pencil size={14} aria-hidden="true" /> Edit profile
                                    </button>
                                </div>
                                <dl className="mt-3 space-y-2 text-sm text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <dt><Mail size={15} className="text-gray-500" aria-label="Email" /></dt>
                                        <dd className="min-w-0 truncate">{user?.emailAddress}</dd>
                                    </div>
                                    {user?.phoneNumber && (
                                        <div className="flex items-center gap-2">
                                            <dt><Phone size={15} className="text-gray-500" aria-label="Phone" /></dt>
                                            <dd>{user.phoneNumber}</dd>
                                        </div>
                                    )}
                                </dl>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-800 ring-1 ring-inset ring-gray-200">
                                        <Shield size={13} aria-hidden="true" /> {user?.role?.roleName || "Team Member"}
                                    </span>
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                                        user?.status === 'Inactive' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                                    )}>
                                        {user?.status || "Active"}
                                    </span>
                                    {user?.isVerified && (
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                                            <CheckCircle2 size={13} aria-hidden="true" /> Verified
                                        </span>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </Section>

            {/* --- WORKSPACE --- */}
            <Section
                title="Workspace"
                description={isAdmin ? "Share the invite code so teammates can join. New members join as Stakeholders." : "You're a member of this workspace."}
            >
                <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="min-w-0">
                        <p className="text-xs text-gray-600">Workspace name</p>
                        <p className="mt-0.5 truncate font-semibold text-gray-900">{user?.workspace?.workspaceName || "—"}</p>
                    </div>

                    {isAdmin && (
                        <div>
                            <p className="text-xs text-gray-600" id="invite-code-label">Invite code</p>
                            <div className="mt-1 flex items-center gap-2">
                                <span aria-labelledby="invite-code-label" className="select-all rounded-lg border border-gray-200 bg-white px-4 py-2 font-mono text-xl font-semibold tracking-[0.25em] text-gray-900">
                                    {user?.workspace?.inviteCode || '------'}
                                </span>
                                <button onClick={handleCopyInvite} className={btn.secondary} aria-label="Copy invite code">
                                    {copied ? <Check size={16} className="text-emerald-600" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                                    <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Section>

            {/* --- ADMIN USER MANAGEMENT PANEL --- */}
            {isAdmin && (
                <Section title="Members" description="Change roles or deactivate people in your workspace. You can't change your own access.">
                    {loadingUsers ? (
                        <div className="space-y-3" role="status" aria-label="Loading members">
                            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
                        </div>
                    ) : usersError ? (
                        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Couldn't load workspace members. Refresh the page to try again.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                            {workspaceUsers.map((member) => {
                                const isSelf = member._id === user._id;
                                const saving = savingUserId === member._id;
                                return (
                                    <li key={member._id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Avatar name={member.fullName || member.emailAddress} src={member.profilePicture} size="lg" />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-gray-900">
                                                    {member.fullName || "Unnamed member"} {isSelf && <span className="font-normal text-gray-500">(you)</span>}
                                                </p>
                                                <p className="truncate text-xs text-gray-600">{member.emailAddress}</p>
                                                {member.lastLogin && <p className="mt-0.5 text-xs text-gray-500">Last sign-in {formatDate(member.lastLogin)}</p>}
                                            </div>
                                        </div>

                                        {/* Role & Status Management */}
                                        <div className="grid shrink-0 grid-cols-2 gap-2 md:flex md:items-center">
                                            <div>
                                                <label htmlFor={`role-${member._id}`} className="sr-only">Role for {member.fullName}</label>
                                                <select
                                                    id={`role-${member._id}`}
                                                    disabled={isSelf || saving}
                                                    value={member.role?.roleName || ""}
                                                    onChange={(e) => handleRoleChange(member, e.target.value)}
                                                    className={cn(field, "md:w-44")}
                                                >
                                                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor={`status-${member._id}`} className="sr-only">Status for {member.fullName}</label>
                                                <select
                                                    id={`status-${member._id}`}
                                                    disabled={isSelf || saving}
                                                    value={member.status || "Active"}
                                                    onChange={(e) => handleStatusChange(member, e.target.value)}
                                                    className={cn(field, "md:w-32", member.status === "Inactive" && "text-red-700")}
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Section>
            )}
        </div>
    );
};

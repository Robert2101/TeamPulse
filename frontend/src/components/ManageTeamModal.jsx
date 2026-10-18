import { useState } from "react";
import { Users, X, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api from "../lib/axios";
import { Avatar } from "./ui/avatar";
import { btn, field } from "../lib/styles";
import { errorMessage } from "../lib/format";
import { toast } from "../lib/toast";

const memberId = (m) => m?._id || m;

export const ManageTeamModal = ({ project, onTeamUpdated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [removingId, setRemovingId] = useState(null);
    const [error, setError] = useState("");

    const members = project.assignedTeamMembers || [];

    const handleAddMember = async (e) => {
        e.preventDefault();
        const normalized = email.trim().toLowerCase();
        if (members.some((m) => m.emailAddress?.toLowerCase() === normalized)) {
            setError("That person is already on this project.");
            return;
        }
        setLoading(true);
        setError("");

        try {
            // The backend resolves email strings to workspace users and rejects unknown addresses.
            const updatedMembers = [...members.map(memberId), normalized];
            const res = await api.put(`/projects/${project._id}`, { assignedTeamMembers: updatedMembers });
            onTeamUpdated(res.data.project);
            setEmail("");
            toast.success("Member added", normalized);
        } catch (err) {
            setError(errorMessage(err, "Couldn't add that member. Make sure they've joined your workspace."));
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (member) => {
        setRemovingId(memberId(member));
        setError("");
        try {
            const updatedMembers = members.filter((m) => memberId(m) !== memberId(member)).map(memberId);
            const res = await api.put(`/projects/${project._id}`, { assignedTeamMembers: updatedMembers });
            onTeamUpdated(res.data.project);
        } catch (err) {
            setError(errorMessage(err, "Couldn't remove that member. Please try again."));
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setError(""); }}>
            <DialogTrigger asChild>
                <button className={btn.secondary} aria-label={`Team (${members.length})`}>
                    <Users size={16} aria-hidden="true" />
                    <span className="hidden sm:inline">Team</span>
                    <span className="tabular rounded bg-gray-100 px-1.5 text-xs text-gray-700">{members.length}</span>
                </button>
            </DialogTrigger>

            <DialogContent className="gap-0 p-0 sm:max-w-lg">
                <div className="border-b border-gray-200 p-6 pr-14">
                    <DialogTitle className="text-lg font-semibold text-gray-900">Project team</DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-gray-600">Members can view this board, comment, and move tasks they're allowed to.</DialogDescription>
                </div>

                <div className="p-6">
                    {error && (
                        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
                        </div>
                    )}

                    <h3 className="mb-3 text-sm font-medium text-gray-900">Members <span className="tabular text-gray-500">({members.length})</span></h3>
                    {members.length > 0 ? (
                        <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {members.map((member) => (
                                <li key={memberId(member)} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-2.5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar name={member.fullName || member.emailAddress} src={member.profilePicture} />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-gray-900">{member.fullName || member.emailAddress || "Team member"}</p>
                                            {member.fullName && member.emailAddress && <p className="truncate text-xs text-gray-600">{member.emailAddress}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemove(member)}
                                        disabled={!!removingId}
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                        aria-label={`Remove ${member.fullName || member.emailAddress || "member"} from project`}
                                    >
                                        {removingId === memberId(member) ? <Loader2 size={14} className="animate-spin" /> : <X size={16} />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">No members yet. Add someone from your workspace below.</p>
                    )}

                    <form onSubmit={handleAddMember} className="mt-6 border-t border-gray-200 pt-6">
                        <label htmlFor="member-email" className="mb-1.5 block text-sm font-medium text-gray-900">Add by email</label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                id="member-email"
                                type="email"
                                required
                                autoComplete="off"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                placeholder="colleague@company.com"
                                className={`${field} flex-1`}
                            />
                            <button disabled={loading} type="submit" className={btn.primary}>
                                {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />} Add
                            </button>
                        </div>
                        <p className="mt-1.5 text-xs text-gray-600">They need to have joined your workspace with its invite code first.</p>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

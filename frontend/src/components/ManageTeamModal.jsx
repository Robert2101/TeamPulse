import { useState } from "react";
import { motion } from "framer-motion";
import { Users, X, UserPlus, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import api from "../lib/axios";

export const ManageTeamModal = ({ project, onTeamUpdated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAddMember = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Note: Your current backend might need a dedicated route to fetch a user by email 
            // and add them to the project.assignedTeamMembers array.
            // For now, simulating the PUT request to update the project.
            const updatedMembers = [...project.assignedTeamMembers, email]; // Needs actual User IDs in a real setup
            const res = await api.put(`/projects/${project._id}`, { assignedTeamMembers: updatedMembers });

            onTeamUpdated(res.data.project);
            setEmail("");
        } catch (err) {
            setError("Failed to add member. Ensure email is registered.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
                    <Users size={16} /> Team
                </button>
            </DialogTrigger>

            <DialogContent className="border-zinc-800 bg-zinc-950/90 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-lg">
                <div className="border-b border-zinc-800 p-6 flex justify-between items-center">
                    <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <Shield size={20} className="text-indigo-400" /> Manage Project Team 
                    </DialogTitle>
                </div>

                <div className="p-6">
                    <div className="mb-6 space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Current Members</h4>
                        {project.assignedTeamMembers?.length > 0 ? (
                            project.assignedTeamMembers.map((member, idx) => (
                                <div key={idx} className="flex items-center justify-between rounded-lg bg-zinc-900 p-3 border border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                                            {member.profilePicture ? (
                                                <img src={member.profilePicture} alt={member.fullName} className="h-full w-full object-cover" />
                                            ) : (
                                                (member.fullName || member.emailAddress || "?")[0].toUpperCase()
                                            )}
                                        </div>
                                        <span className="text-sm text-zinc-200">{member.fullName || member.emailAddress || member}</span>
                                    </div>
                                    <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Member</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-zinc-500">No additional members assigned yet.</p>
                        )}
                    </div>

                    <form onSubmit={handleAddMember} className="border-t border-zinc-800 pt-6">
                        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Invite New Member</h4>
                        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
                        <div className="flex gap-2">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Colleague's email address..."
                                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                            />
                            <button disabled={loading} type="submit" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                                <UserPlus size={16} /> Add
                            </button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};
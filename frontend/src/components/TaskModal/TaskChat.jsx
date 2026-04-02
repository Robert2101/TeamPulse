import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, Edit2, Trash2, AlertTriangle, X } from "lucide-react";
import api from "../../lib/axios";
import { FileDropZone } from "../files/FileDropZone";

export const TaskChat = ({ task, project, socket, user }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editContent, setEditContent] = useState("");
    const [commentToDelete, setCommentToDelete] = useState(null);

    const [commentFile, setCommentFile] = useState(null);
    const [uploadingCommentMedia, setUploadingCommentMedia] = useState(false);

    const [typingUsers, setTypingUsers] = useState([]);
    const typingTimeoutRef = useRef(null);

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const fetchComments = async () => {
            try {
                const res = await api.get(`/comments/task/${task._id}`);
                setComments(res.data);
                setTimeout(scrollToBottom, 100);
            } catch (err) {
                console.error("Failed to load comments", err);
                setError("Failed to load comments. Please refresh.");
            } finally {
                setLoading(false);
            }
        };
        fetchComments();
    }, [task._id]);

    useEffect(() => {
        if (!socket) return;

        const handleNewComment = (data) => {
            if (data.taskId === task._id) {
                setComments((prev) => {
                    // BUG #5 FIX: Deduplicate solely by real _id.
                    // The HTTP response already replaced the temp entry, so the socket
                    // broadcast will find the real ID and skip re-adding it.
                    if (prev.find(c => c._id === data.comment._id)) return prev;

                    // RACE CONDITION FIX: If socket arrives BEFORE the HTTP response resolves,
                    // we replace the matching temporary optimistic comment with the real one.
                    // This way, if the HTTP response drops, we still have the saved comment, 
                    // and we never duplicate messages on the screen.
                    const tempCommentIndex = prev.findIndex(c => 
                        typeof c._id === 'string' &&
                        c._id.startsWith('temp-') &&
                        c.commentContent === data.comment.commentContent &&
                        c.author?._id === data.comment.author?._id
                    );

                    if (tempCommentIndex !== -1) {
                        const newComments = [...prev];
                        newComments[tempCommentIndex] = data.comment;
                        return newComments;
                    }

                    return [...prev, data.comment];
                });
                setTimeout(scrollToBottom, 100);
            }
        };

        const handleCommentEdited = (editedComment) => {
            setComments(prev => prev.map(c => c._id === editedComment._id ? editedComment : c));
        };

        const handleCommentDeleted = (deletedCommentId) => {
            setComments(prev => prev.filter(c => c._id !== deletedCommentId));
        };

        const handleUserTyping = (data) => {
            if (data.taskId === task._id && data.userName !== user?.fullName) {
                setTypingUsers(prev => prev.includes(data.userName) ? prev : [...prev, data.userName]);
            }
        };

        const handleUserStopTyping = (data) => {
            if (data.taskId === task._id && data.userName !== user?.fullName) {
                setTypingUsers(prev => prev.filter(name => name !== data.userName));
            }
        };

        socket.on("new-comment", handleNewComment);
        socket.on("comment-edited", handleCommentEdited);
        socket.on("comment-deleted", handleCommentDeleted);
        socket.on("user-typing", handleUserTyping);
        socket.on("user-stop-typing", handleUserStopTyping);

        return () => {
            socket.off("new-comment", handleNewComment);
            socket.off("comment-edited", handleCommentEdited);
            socket.off("comment-deleted", handleCommentDeleted);
            socket.off("user-typing", handleUserTyping);
            socket.off("user-stop-typing", handleUserStopTyping);
        };
    }, [socket, task._id]);

    // Handle input change & emit typing events
    const handleInputChange = (e) => {
        setNewComment(e.target.value);
        if (!socket || !project?._id) return;

        socket.emit("typing", { 
            projectId: project._id, 
            taskId: task._id, 
            userName: user?.fullName 
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stop-typing", { 
                projectId: project._id, 
                taskId: task._id, 
                userName: user?.fullName 
            });
        }, 2000);
    };

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() && !commentFile) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (socket && project?._id) {
            socket.emit("stop-typing", { projectId: project._id, taskId: task._id, userName: user?.fullName });
        }

        const commentText = newComment.trim() || (commentFile ? "Attached a file" : "");
        // BUG #6 FIX: Capture input before clearing so we can restore it on failure.
        setNewComment("");
        setError(null);

        const tempId = `temp-${Date.now()}`;
        const optimisticComment = {
            _id: tempId,
            commentContent: commentText,
            author: user,
            createdAt: new Date().toISOString()
        };

        setComments(prev => [...prev, optimisticComment]);
        setTimeout(scrollToBottom, 50);

        try {
            const res = await api.post(`/comments/task/${task._id}`, { commentContent: commentText });
            const savedComment = res.data.comment;

            // BUG #5 FIX: Immediately replace the temp entry with the persisted comment.
            // This prevents the socket broadcast from seeing a stale temp entry and
            // avoids the content-based dedup race condition when two users post identical text.
            setComments(prev => prev.map(c => c._id === tempId ? savedComment : c));

            if (commentFile && savedComment?._id) {
                setUploadingCommentMedia(true);
                try {
                    const formData = new FormData();
                    formData.append('file', commentFile);
                    formData.append('entityType', 'Comment');
                    formData.append('entityId', savedComment._id);
                    const fileRes = await api.post('/files/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    setComments(prev => prev.map(c =>
                        c._id === savedComment._id ? { ...c, attachments: [fileRes.data.file] } : c
                    ));
                } catch (err) {
                    console.error("Failed to upload comment media", err);
                    // BUG #15 FIX: Inform user about the attachment failure.
                    setError("Comment posted but file attachment failed. Please try attaching again.");
                } finally {
                    setCommentFile(null);
                    setUploadingCommentMedia(false);
                }
            }
        } catch (err) {
            console.error("Failed to post comment", err);
            // BUG #6 FIX: Roll back the optimistic comment and restore the input.
            setComments(prev => prev.filter(c => c._id !== tempId));
            setNewComment(commentText);
            setError("Failed to send message. Please try again.");
        }
    };

    const handleEditSubmit = async (commentId) => {
        if (!editContent.trim()) return;
        const previousContent = comments.find(c => c._id === commentId)?.commentContent;
        setError(null);
        try {
            await api.patch(`/comments/${commentId}`, { commentContent: editContent });
            setComments(prev => prev.map(c => c._id === commentId ? { ...c, commentContent: editContent, edited: true } : c));
            setEditingCommentId(null);
            setEditContent("");
        } catch (err) {
            console.error("Failed to edit comment", err);
            // BUG #15 FIX: Revert optimistic edit and show error.
            if (previousContent !== undefined) {
                setComments(prev => prev.map(c => c._id === commentId ? { ...c, commentContent: previousContent } : c));
            }
            setError("Failed to update comment. Please try again.");
        }
    };

    const confirmDelete = async (commentId) => {
        // BUG #7 FIX: Capture the comment before removing it so we can restore on failure.
        const commentToRestore = comments.find(c => c._id === commentId);
        setComments(prev => prev.filter(c => c._id !== commentId));
        setCommentToDelete(null);
        setError(null);
        try {
            await api.delete(`/comments/${commentId}`);
        } catch (err) {
            console.error("Failed to delete comment", err);
            // BUG #7 FIX: Restore the comment if the delete request failed.
            if (commentToRestore) {
                setComments(prev => {
                    if (prev.find(c => c._id === commentId)) return prev;
                    return [...prev, commentToRestore].sort(
                        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                    );
                });
            }
            setError("Failed to delete comment. Please try again.");
        }
    };

    return (
        <div className="flex h-full w-full flex-col bg-transparent">
            <div className="border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
                    <MessageSquare size={14} className="text-indigo-400" /> Team Discussion
                </h3>
            </div>

            {/* BUG #15 FIX: Inline error banner visible to the user */}
            {error && (
                <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
                    <AlertTriangle size={14} className="shrink-0 text-red-400" />
                    <span className="flex-1 text-xs text-red-300">{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
                        <X size={13} />
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loading ? (
                    <div className="animate-pulse text-zinc-500">Loading discussion...</div>
                ) : comments.length === 0 ? (
                    <div className="text-center text-sm text-zinc-500 mt-10">No comments yet. Start the conversation!</div>
                ) : (
                    comments.map(c => {
                        const authorId = typeof c.author === 'object' ? c.author?._id : c.author;
                        // BUG #13 alignment: use toString() for reliable ObjectId comparison
                        const isMe = authorId?.toString() === user?._id?.toString();
                        const isAdminUser = user?.role?.roleName === 'Admin';
                        // BUG #9 FIX: canModify correctly restricts buttons to author or Admin only.
                        const canModify = isMe || isAdminUser;
                        const authorName = isMe ? user?.fullName : (c.author?.fullName || "Team Member");
                        const isTemp = c._id.startsWith('temp-');

                        return (
                            <div key={c._id} className={`group flex flex-col ${isMe ? "items-end" : "items-start"} mb-4`}>
                                <span className={`mb-1 text-[10px] text-zinc-500 flex items-center gap-1 ${isMe ? "mr-9" : "ml-9"}`}>
                                    {authorName} {c.edited && "(edited)"}
                                </span>

                                {editingCommentId === c._id ? (
                                    <div className="flex w-full max-w-[85%] flex-col gap-2">
                                        <input
                                            autoFocus
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="w-full rounded-lg border border-indigo-500 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                                        />
                                        <div className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"}`}>
                                            <button onClick={() => setEditingCommentId(null)} className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200">Cancel</button>
                                            <button onClick={() => handleEditSubmit(c._id)} className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300">Save</button>
                                        </div>
                                    </div>
                                ) : commentToDelete === c._id ? (
                                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                                        <AlertTriangle size={16} className="text-red-400" />
                                        <span className="text-xs font-medium text-red-200">Delete comment?</span>
                                        <div className="flex gap-2 ml-2">
                                            <button onClick={() => setCommentToDelete(null)} className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700">Cancel</button>
                                            <button onClick={() => confirmDelete(c._id)} className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500">Delete</button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="relative flex items-end gap-2 max-w-full">
                                        {isMe && !isTemp && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 mb-2">
                                                <button onClick={() => { setEditingCommentId(c._id); setEditContent(c.commentContent); }} className="text-zinc-500 hover:text-indigo-400"><Edit2 size={14} /></button>
                                                <button onClick={() => setCommentToDelete(c._id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        )}

                                        {!isMe && (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400 border border-zinc-700">
                                                {c.author?.profilePicture ? (
                                                    <img src={c.author.profilePicture} alt="User" className="h-full w-full object-cover" />
                                                ) : (authorName.charAt(0).toUpperCase())}
                                            </div>
                                        )}

                                        <div className={`rounded-2xl px-4 py-3 text-sm ${isMe ? "bg-indigo-600 text-white rounded-br-none" : "bg-zinc-800 text-zinc-100 rounded-bl-none"} max-w-[85%] sm:max-w-[75%]`}>
                                            {c.commentContent}
                                            {c.attachments?.length > 0 && c.attachments[0]?.url && c.attachments[0]?.fileType?.startsWith('image/') && (
                                                <img src={c.attachments[0].url} alt="media" className="mt-3 w-full max-h-[350px] rounded-lg object-contain bg-zinc-950/50 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(c.attachments[0].url, '_blank')} />
                                            )}
                                        </div>

                                        {isMe && (
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
                                                {user?.profilePicture ? (
                                                    <img src={user.profilePicture} alt="Me" className="h-full w-full object-cover" />
                                                ) : (user?.fullName?.charAt(0).toUpperCase() || "U")}
                                            </div>
                                        )}

                                        {/* BUG #9 FIX: Only Admin (not the author) sees action buttons on others' comments */}
                                        {!isMe && isAdminUser && !isTemp && (
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 mb-2">
                                                <button onClick={() => setCommentToDelete(c._id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-zinc-800 p-4 bg-zinc-950 relative">
                {typingUsers.length > 0 && (
                    <div className="absolute -top-7 left-4 text-[11px] text-zinc-400 italic flex items-center gap-1">
                        <span className="flex gap-0.5 items-center mr-1 mt-0.5">
                            <span className="h-1 w-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-1 w-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-1 w-1 bg-zinc-400 rounded-full animate-bounce"></span>
                        </span>
                        {typingUsers.length > 2 
                            ? `${typingUsers.length} people are typing...` 
                            : `${typingUsers.join(' and ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
                        }
                    </div>
                )}
                {commentFile && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5">
                        <span className="truncate text-xs text-zinc-300">{commentFile.name}</span>
                        <button onClick={() => setCommentFile(null)} className="ml-auto text-zinc-500 hover:text-red-400"><X size={14} /></button>
                    </div>
                )}
                <form onSubmit={handleSendComment} className="flex items-center gap-2">
                    <FileDropZone compact multiple={false} onFilesDropped={(files) => setCommentFile(files[0])} uploading={uploadingCommentMedia} />
                    <input 
                        type="text" 
                        value={newComment} 
                        onChange={handleInputChange} 
                        placeholder="Type a message..." 
                        className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 pl-4 pr-4 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" 
                    />
                    <button type="submit" disabled={!newComment.trim() && !commentFile} className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                        <Send size={14} className="ml-0.5" />
                    </button>
                </form>
            </div>
        </div>
    );
};
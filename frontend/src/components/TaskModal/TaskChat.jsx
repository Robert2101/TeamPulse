import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Edit2, Trash2, AlertTriangle, X, Paperclip } from "lucide-react";
import api from "../../lib/axios";
import { FileDropZone } from "../files/FileDropZone";
import { Avatar } from "../ui/avatar";
import { relativeTime } from "../../lib/format";

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

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (socket && project?._id) {
                socket.emit("stop-typing", { projectId: project._id, taskId: task._id, userName: user?.fullName });
            }
        };
    }, []);

    // Scroll only the message list; scrollIntoView would also scroll the stacked panel on small screens.
    const scrollToBottom = () => {
        const list = messagesEndRef.current?.parentElement;
        if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
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

    const isAdminUser = user?.role?.roleName === 'Admin';
    const actionBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100";
    // Visible on hover/focus for pointer devices, always visible on touch screens.
    const actionsReveal = "flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

    return (
        <div className="flex h-full w-full flex-col bg-transparent">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <MessageSquare size={16} className="text-gray-500" aria-hidden="true" /> Discussion
                    {comments.length > 0 && <span className="tabular font-normal text-gray-500">({comments.length})</span>}
                </h3>
            </div>

            {/* BUG #15 FIX: Inline error banner visible to the user */}
            {error && (
                <div role="alert" className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <AlertTriangle size={14} className="shrink-0 text-red-600" aria-hidden="true" />
                    <span className="flex-1 text-sm text-red-800">{error}</span>
                    <button onClick={() => setError(null)} className="rounded p-1 text-red-700 hover:bg-red-100" aria-label="Dismiss error">
                        <X size={13} />
                    </button>
                </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite" aria-relevant="additions">
                {loading ? (
                    <div className="space-y-4" role="status" aria-label="Loading discussion">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className={`flex animate-pulse items-end gap-2 ${i % 2 ? "justify-end" : ""}`}>
                                {i % 2 === 0 && <div className="h-7 w-7 rounded-full bg-gray-200" />}
                                <div className="h-12 w-1/2 rounded-2xl bg-gray-100" />
                            </div>
                        ))}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="mt-10 text-center">
                        <p className="text-sm font-medium text-gray-900">No comments yet</p>
                        <p className="mt-1 text-sm text-gray-600">Ask a question or share an update. Everyone on the project sees it live.</p>
                    </div>
                ) : (
                    comments.map(c => {
                        const authorId = typeof c.author === 'object' ? c.author?._id : c.author;
                        // BUG #13 alignment: use toString() for reliable ObjectId comparison
                        const isMe = authorId?.toString() === user?._id?.toString();
                        const authorName = isMe ? user?.fullName : (c.author?.fullName || "Team Member");
                        const isTemp = String(c._id).startsWith('temp-');
                        const image = c.attachments?.[0]?.url && c.attachments[0]?.fileType?.startsWith('image/') ? c.attachments[0] : null;

                        return (
                            <div key={c._id} className={`group flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <span className={`mb-1 flex items-center gap-1.5 text-xs text-gray-600 ${isMe ? "mr-9" : "ml-9"}`}>
                                    <span className="font-medium text-gray-800">{isMe ? "You" : authorName}</span>
                                    {c.createdAt && <span>· {relativeTime(c.createdAt)}</span>}
                                    {c.edited && <span>· edited</span>}
                                    {isTemp && <span>· sending…</span>}
                                </span>

                                {editingCommentId === c._id ? (
                                    <div className="flex w-full max-w-[85%] flex-col gap-2">
                                        <label htmlFor={`edit-${c._id}`} className="sr-only">Edit comment</label>
                                        <input
                                            id={`edit-${c._id}`}
                                            autoFocus
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") { e.preventDefault(); handleEditSubmit(c._id); }
                                                if (e.key === "Escape") { e.preventDefault(); setEditingCommentId(null); }
                                            }}
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/20 sm:text-sm"
                                        />
                                        <div className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                                            <button onClick={() => setEditingCommentId(null)} className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">Cancel</button>
                                            <button onClick={() => handleEditSubmit(c._id)} disabled={!editContent.trim()} className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">Save</button>
                                        </div>
                                    </div>
                                ) : commentToDelete === c._id ? (
                                    <div role="alertdialog" aria-label="Delete comment?" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                                        <AlertTriangle size={16} className="text-red-600" aria-hidden="true" />
                                        <span className="text-sm font-medium text-red-900">Delete this comment?</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => setCommentToDelete(null)} className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                                            <button onClick={() => confirmDelete(c._id)} autoFocus className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative flex max-w-full items-end gap-2">
                                        {isMe && !isTemp && (
                                            <div className={`${actionsReveal} mb-1`}>
                                                <button onClick={() => { setEditingCommentId(c._id); setEditContent(c.commentContent); }} className={`${actionBtn} hover:text-gray-900`} aria-label="Edit comment"><Edit2 size={14} /></button>
                                                <button onClick={() => setCommentToDelete(c._id)} className={`${actionBtn} hover:bg-red-50 hover:text-red-700`} aria-label="Delete comment"><Trash2 size={14} /></button>
                                            </div>
                                        )}

                                        {!isMe && <Avatar name={authorName} src={c.author?.profilePicture} size="sm" />}

                                        <div className={`max-w-[85%] rounded-2xl border px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere sm:max-w-[75%] ${isMe ? "rounded-br-md border-indigo-100 bg-indigo-50 text-gray-900" : "rounded-bl-md border-gray-200 bg-white text-gray-900"} ${isTemp ? "opacity-70" : ""}`}>
                                            {c.commentContent}
                                            {image && (
                                                <a href={image.url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
                                                    <img src={image.url} alt={image.name || `Image shared by ${authorName}`} loading="lazy" className="max-h-[350px] w-full rounded-lg bg-gray-50 object-contain transition-opacity hover:opacity-90" />
                                                </a>
                                            )}
                                        </div>

                                        {isMe && <Avatar name={user?.fullName} src={user?.profilePicture} size="sm" />}

                                        {/* BUG #9 FIX: Only Admin (not the author) sees action buttons on others' comments */}
                                        {!isMe && isAdminUser && !isTemp && (
                                            <div className={`${actionsReveal} mb-1`}>
                                                <button onClick={() => setCommentToDelete(c._id)} className={`${actionBtn} hover:bg-red-50 hover:text-red-700`} aria-label={`Delete comment by ${authorName}`}><Trash2 size={14} /></button>
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

            <div className="relative border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                {typingUsers.length > 0 && (
                    <div className="absolute -top-7 left-4 flex items-center gap-1 rounded-full bg-white/90 px-2 text-xs italic text-gray-600" aria-live="polite">
                        <span className="mr-1 mt-0.5 flex items-center gap-0.5" aria-hidden="true">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                            <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                            <span className="h-1 w-1 animate-pulse rounded-full bg-gray-400"></span>
                        </span>
                        {typingUsers.length > 2
                            ? `${typingUsers.length} people are typing…`
                            : `${typingUsers.join(' and ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing…`
                        }
                    </div>
                )}
                {commentFile && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5">
                        <Paperclip size={14} className="shrink-0 text-gray-500" aria-hidden="true" />
                        <span className="truncate text-xs text-gray-800">{commentFile.name}</span>
                        <button onClick={() => setCommentFile(null)} className="ml-auto rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-700" aria-label={`Remove attachment ${commentFile.name}`}><X size={14} /></button>
                    </div>
                )}
                <form onSubmit={handleSendComment} className="flex items-center gap-2">
                    <FileDropZone compact multiple={false} onFilesDropped={(files) => setCommentFile(files[0])} uploading={uploadingCommentMedia} />
                    <label htmlFor={`comment-input-${task._id}`} className="sr-only">Write a comment</label>
                    <input
                        id={`comment-input-${task._id}`}
                        type="text"
                        value={newComment}
                        onChange={handleInputChange}
                        maxLength={2000}
                        placeholder="Write a comment…"
                        className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-base text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/20 sm:text-sm"
                    />
                    <button type="submit" disabled={!newComment.trim() && !commentFile} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-500" aria-label="Send comment">
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
};

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";
import api from "../lib/axios";

export const AiChat = () => {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: "assistant",
            text: "Hello! I am your TeamPulse AI. I can help you with task queries, project updates, or finding your way around. What do you need?"
        }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), role: "user", text: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            // Hitting the backend endpoint we verified earlier
            const response = await api.post("/chatbot/ask", { query: userMsg.text });

            const botMsg = {
                id: Date.now() + 1,
                role: "assistant",
                text: response.data.reply
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMsg = {
                id: Date.now() + 1,
                role: "assistant",
                text: "I'm having trouble connecting to the system data right now. Please try again."
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/30 shadow-2xl">
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900/50 px-6 py-4 backdrop-blur-md rounded-t-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-zinc-100">TeamPulse AI</h2>
                    <p className="text-xs text-zinc-400">Powered by Gemini 2.5 Flash</p>
                </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`flex max-w-[80%] gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-zinc-800 text-zinc-300" : "bg-indigo-600 text-white"
                                    }`}>
                                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`rounded-2xl px-5 py-3 text-sm ${msg.role === "user"
                                        ? "bg-zinc-800 text-zinc-100 rounded-tr-sm"
                                        : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-100 rounded-tl-sm"
                                    }`}>
                                    {/* Simple markdown parsing for lists/newlines if Gemini returns them */}
                                    {msg.text.split('\n').map((line, i) => (
                                        <span key={i} className="block min-h-[1rem]">{line}</span>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Loading Indicator */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex w-full justify-start"
                    >
                        <div className="flex max-w-[80%] gap-3 flex-row">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                                <Bot size={16} />
                            </div>
                            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 px-5 py-4 text-sm rounded-tl-sm flex gap-1.5 items-center">
                                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="h-2 w-2 rounded-full bg-indigo-400" />
                                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="h-2 w-2 rounded-full bg-indigo-400" />
                                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="h-2 w-2 rounded-full bg-indigo-400" />
                            </div>
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-zinc-800 bg-zinc-950/50 p-4 rounded-b-2xl">
                <form onSubmit={handleSend} className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your projects, tasks, or team..."
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-4 pl-4 pr-14 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-1" />}
                    </button>
                </form>
            </div>
        </div>
    );
};
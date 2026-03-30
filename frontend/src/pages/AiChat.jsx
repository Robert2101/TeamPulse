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

    // Fetch History on Load
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get("/chatbot/history");
                if (response.data && response.data.length > 0) {
                    setMessages(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch chat history:", error);
            }
        };
        fetchHistory();
    }, []);

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

        const userText = input;
        const userMsg = { id: Date.now(), role: "user", text: userText };
        
        // Setup empty bot message
        const botMsgId = Date.now() + 1;
        const tempBotMsg = { id: botMsgId, role: "assistant", text: "" };
        
        setMessages((prev) => [...prev, userMsg, tempBotMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const API_URL = import.meta.env.VITE_API_URL 
                ? `${import.meta.env.VITE_API_URL}/api/chatbot/ask`
                : "http://localhost:5001/api/chatbot/ask";
                
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // If you rely on cookies for auth, ensure credentials are included:
                },
                credentials: "include", // Required if your API uses cookies to verify req.dbUser
                body: JSON.stringify({ query: userText }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Set up stream reader
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            setIsLoading(false); // Stop loading animation since stream is starting

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                            const dataStr = line.replace('data: ', '').trim();
                            if (dataStr) {
                                try {
                                    const parsed = JSON.parse(dataStr);
                                    if (parsed.textChunk) {
                                        setMessages((prev) => 
                                            prev.map(msg => 
                                                msg.id === botMsgId 
                                                ? { ...msg, text: msg.text + parsed.textChunk }
                                                : msg
                                            )
                                        );
                                    }
                                } catch (err) {
                                    console.error("Error parsing stream chunk", err, dataStr);
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Chatbot error:", error);
            setMessages((prev) => 
                prev.map(msg => 
                    msg.id === botMsgId 
                    ? { ...msg, text: "I'm having trouble connecting to the system data right now. Please try again." }
                    : msg
                )
            );
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
                                    {/* Clean formatting: properly strip all asterisks and format bullets */}
                                    {msg.text.split('\n').map((line, i) => {
                                        // Remove all ** from anywhere
                                        let cleanLine = line.replace(/\*\*/g, '');
                                        // Replace leading `* ` or ` - ` (even if indented) with a neat dot
                                        cleanLine = cleanLine.replace(/^\s*[\*-]\s+/, '• ');
                                        
                                        return (
                                            <span key={i} className="block min-h-[1.25rem]">
                                                {cleanLine}
                                            </span>
                                        );
                                    })}
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

            {/* Quick Prompts Container */}
            <div className="flex flex-wrap gap-2 px-4 pb-3">
                {[
                    "What are my pending tasks?",
                    "Give me a summary of my active projects",
                    "Which of my tasks is the highest priority?",
                    "Update one of my tasks to 'In Progress'"
                ].map((prompt, idx) => (
                    <button
                        key={idx}
                        onClick={() => setInput(prompt)}
                        className="text-xs py-1.5 px-3 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors text-left"
                    >
                        {prompt}
                    </button>
                ))}
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
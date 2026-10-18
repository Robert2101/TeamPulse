import { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, Loader2 } from "lucide-react";
import api from "../lib/axios";
import { useStore } from "../store/useStore";
import { Avatar } from "../components/ui/avatar";
import { cn } from "../lib/utils";

const GREETING = {
    id: 1,
    role: "assistant",
    text: "Hello! I am your TeamPulse AI. I can help you with task queries, project updates, or finding your way around. What do you need?"
};

const QUICK_PROMPTS = [
    "What are my pending tasks?",
    "Give me a summary of my active projects",
    "Which of my tasks is the highest priority?",
    "Update one of my tasks to 'In Progress'"
];

const ASK_URL = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api/chatbot/ask`
    : import.meta.env.MODE === "production"
        ? "/api/chatbot/ask"
        : "http://localhost:5001/api/chatbot/ask";

// Light formatting: strip markdown bold markers and turn list markers into bullets.
const renderText = (text) =>
    text.split('\n').map((line, i) => {
        const cleanLine = line.replace(/\*\*/g, '').replace(/^\s*[*-]\s+/, '• ');
        return <span key={i} className="block min-h-5">{cleanLine}</span>;
    });

export const AiChat = () => {
    const { user } = useStore();
    const [messages, setMessages] = useState([GREETING]);
    const [input, setInput] = useState("");
    // "idle" | "waiting" (request sent, no tokens yet) | "streaming"
    const [phase, setPhase] = useState("idle");
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const busy = phase !== "idle";

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
    useEffect(() => {
        const list = messagesEndRef.current?.parentElement;
        if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    }, [messages, phase]);

    const setBotText = (id, updater) =>
        setMessages((prev) => prev.map(msg => (msg.id === id ? { ...msg, text: updater(msg.text) } : msg)));

    const handleSend = async (e) => {
        e.preventDefault();
        const userText = input.trim();
        if (!userText || busy) return;

        const userMsg = { id: Date.now(), role: "user", text: userText };
        const botMsgId = Date.now() + 1;
        setMessages((prev) => [...prev, userMsg, { id: botMsgId, role: "assistant", text: "" }]);
        setInput("");
        setPhase("waiting");

        try {
            const response = await fetch(ASK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // auth cookie identifies req.dbUser
                body: JSON.stringify({ query: userText }),
            });

            if (!response.ok) {
                let message = "";
                try { message = (await response.json())?.message; } catch { /* non-JSON error body */ }
                if (response.status === 429) throw new Error(message || "You've reached the hourly assistant limit. Try again later.");
                if (response.status === 401) throw new Error("Your session expired. Sign in again to keep chatting.");
                throw new Error(message || "The assistant is unavailable right now. Please try again in a moment.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            let gotText = false;
            setPhase("streaming");

            // SSE lines can be split across network chunks: buffer and only parse complete lines.
            for (;;) {
                const { value, done } = await reader.read();
                buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
                const lines = buffer.split('\n');
                buffer = done ? "" : lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
                    const dataStr = line.slice(6).trim();
                    if (!dataStr) continue;
                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.textChunk) {
                            gotText = true;
                            setBotText(botMsgId, (t) => t + parsed.textChunk);
                        }
                        if (parsed.error) throw new Error(parsed.error);
                    } catch (err) {
                        if (err instanceof SyntaxError) console.error("Error parsing stream chunk", err, dataStr);
                        else throw err;
                    }
                }
                if (done) break;
            }

            if (!gotText) setBotText(botMsgId, () => "I couldn't come up with an answer for that. Try rephrasing your question.");
        } catch (error) {
            console.error("Chatbot error:", error);
            setBotText(botMsgId, (t) => t || error.message || "I'm having trouble connecting to the system data right now. Please try again.");
            setMessages((prev) => prev.map(msg => (msg.id === botMsgId ? { ...msg, failed: true } : msg)));
        } finally {
            setPhase("idle");
            inputRef.current?.focus();
        }
    };

    const conversationStarted = messages.some((m) => m.role === "user");

    return (
        <div className="mx-auto flex h-[calc(100dvh-6.5rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] md:h-[calc(100dvh-8rem)]">
            {/* Chat Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Sparkles size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <h1 className="text-base font-semibold text-gray-900">TeamPulse AI</h1>
                    <p className="text-xs text-gray-600">Answers from your own projects and tasks · Gemini 2.5 Flash</p>
                </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6" role="log" aria-live="polite" aria-label="Conversation">
                {messages.map((msg) => {
                    const isUser = msg.role === "user";
                    if (!isUser && !msg.text && busy) return null; // placeholder while waiting; shown as typing indicator below
                    return (
                        <div key={msg.id} className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
                            <div className={cn("flex max-w-[92%] gap-3 sm:max-w-[80%]", isUser ? "flex-row-reverse" : "flex-row")}>
                                {isUser ? (
                                    <Avatar name={user?.fullName} src={user?.profilePicture} size="md" />
                                ) : (
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700">
                                        <Bot size={16} aria-hidden="true" />
                                    </span>
                                )}
                                <div className={cn(
                                    "min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed wrap-anywhere",
                                    isUser
                                        ? "rounded-tr-md bg-indigo-600 text-white"
                                        : msg.failed
                                            ? "rounded-tl-md border border-red-200 bg-red-50 text-red-900"
                                            : "rounded-tl-md border border-gray-200 bg-white text-gray-900"
                                )}>
                                    <span className="sr-only">{isUser ? "You said:" : "Assistant:"}</span>
                                    {renderText(msg.text)}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Waiting for first token */}
                {phase === "waiting" && (
                    <div className="flex w-full justify-start" role="status">
                        <div className="flex gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700">
                                <Bot size={16} aria-hidden="true" />
                            </span>
                            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-gray-200 bg-white px-4 py-3.5">
                                <span className="sr-only">Assistant is thinking</span>
                                <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:-0.3s]" aria-hidden="true" />
                                <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:-0.15s]" aria-hidden="true" />
                                <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" aria-hidden="true" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts: only before the first question, so they don't crowd an ongoing conversation */}
            {!conversationStarted && (
                <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-3 sm:flex-wrap sm:px-6">
                    {QUICK_PROMPTS.map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                            className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-left text-xs text-gray-700 transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-900"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <div className="shrink-0 border-t border-gray-200 bg-gray-50 p-3 sm:p-4">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <label htmlFor="ai-input" className="sr-only">Ask the assistant</label>
                    <input
                        id="ai-input"
                        ref={inputRef}
                        type="text"
                        value={input}
                        maxLength={1000}
                        autoComplete="off"
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={busy ? "Waiting for the answer…" : "Ask about your projects, tasks, or team…"}
                        className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/20 sm:text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || busy}
                        aria-label={busy ? "Waiting for the answer" : "Send message"}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-500"
                    >
                        {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

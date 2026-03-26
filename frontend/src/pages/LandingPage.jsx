import { motion, useScroll, useTransform } from "framer-motion";
import GradientBlinds from "../components/GradientBlinds";
import ScrollStack, { ScrollStackItem } from "../components/ScrollStack";

export const LandingPage = () => {
    const { scrollYProgress: heroScroll } = useScroll();
    const heroY = useTransform(heroScroll, [0, 1], [0, -200]);
    const heroOpacity = useTransform(heroScroll, [0, 0.2], [1, 0]);

    const features = [
        { title: "Kanban Precision", description: "Manage tasks with fluid drag-and-drop movements that sync instantly via WebSockets.", tag: "Workflow", color: "from-indigo-900 to-zinc-950" },
        { title: "AI Orchestration", description: "Ask Gemini to summarize projects or find pending tasks directly in your dashboard.", tag: "Intelligence", color: "from-purple-900 to-zinc-950" },
        { title: "Role-Based Security", description: "Strict compliance. Admins, Managers, and Members see exactly what they need to.", tag: "Enterprise", color: "from-emerald-900 to-zinc-950" },
        { title: "Audit Analytics", description: "Track every movement. Visualizers and logs ensure you never lose track of activity.", tag: "Reporting", color: "from-orange-900 to-zinc-950" }
    ];

    return (
        <div className="relative bg-zinc-950 text-white selection:bg-indigo-500/30 overflow-hidden">

            {/* --- HERO SECTION --- */}
            <section className="relative flex h-screen flex-col items-center justify-center px-4 overflow-hidden bg-zinc-950">

                {/*  Interactive Gradient Blinds Background  */}
                <div className="absolute inset-0 w-full h-full z-0 opacity-40">
                    <GradientBlinds
                        gradientColors={['#4F46E5', '#7C3AED', '#2563EB']} // TeamPulse Indigo & Blue colors
                        angle={30}
                        noise={0.4}
                        blindCount={12}
                        spotlightRadius={0.7}
                        spotlightSoftness={1}
                        spotlightOpacity={0.8}
                        mouseDampening={0.15}
                        distortAmount={0.1}
                        shineDirection="left"
                        mixBlendMode="screen"
                    />
                </div>

                {/* Sub-glows to blend the sharp edges */}
                <div className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none z-0" />
                <div className="absolute top-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-purple-600/10 blur-[100px] pointer-events-none z-0" />

                {/* --- THE TEXT CONTENT --- */}
                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="z-10 text-center pointer-events-none">

                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 inline-block rounded-full border border-zinc-700/50 bg-zinc-900/60 px-4 py-1.5 text-xs font-bold tracking-widest text-indigo-400 uppercase backdrop-blur-xl shadow-xl"
                    >
                        Powered by Gemini AI
                    </motion.span>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-6 text-6xl font-extrabold tracking-tighter md:text-8xl drop-shadow-2xl"
                    >
                        Team<span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Pulse</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mx-auto mb-10 max-w-xl text-lg text-zinc-300 md:text-xl font-medium drop-shadow-md"
                    >
                        Ditch the chaos. Experience project management that breathes with your team.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex gap-4 justify-center pointer-events-auto"
                    >
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="rounded-full bg-indigo-600 px-8 py-4 font-bold text-white shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 cursor-pointer border border-indigo-500"
                        >
                            Get Started Free
                        </button>
                    </motion.div>

                </motion.div>
            </section>

            {/*  SCROLL STACK SECTION  */}
            <section className="relative h-screen bg-zinc-950 w-full z-20 border-t border-zinc-900/50">
                <ScrollStack
                    itemDistance={120}
                    itemScale={0.05}
                    itemStackDistance={40}
                    blurAmount={4} // Adds depth of field blur to the cards in the back
                    className="h-full w-full"
                >
                    <div className="text-center pt-20 pb-10">
                        <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Built for speed. <br /><span className="text-zinc-500">Designed for scale.</span></h2>
                        <p className="mt-4 text-lg text-zinc-400">Scroll to explore the core features.</p>
                    </div>

                    {features.map((feature, index) => (
                        <ScrollStackItem
                            key={index}
                            itemClassName={`bg-gradient-to-br ${feature.color} flex flex-col justify-between p-10 overflow-hidden border border-zinc-800`}
                        >
                            <div className="relative z-10">
                                <span className="mb-4 inline-block rounded-full bg-zinc-950/50 border border-zinc-800 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-md">
                                    {feature.tag}
                                </span>
                                <h3 className="mb-4 text-4xl font-bold text-white">{feature.title}</h3>
                                <p className="text-xl text-zinc-300 leading-relaxed max-w-lg">{feature.description}</p>
                            </div>
                        </ScrollStackItem>
                    ))}
                </ScrollStack>
            </section>

            {/* --- FOOTER --- */}
            <section className="flex h-[50vh] flex-col items-center justify-center border-t border-zinc-900 bg-zinc-950 z-10">
                <h2 className="text-3xl font-bold text-white">Ready to take control?</h2>
                <button
                    onClick={() => window.location.href = '/register'}
                    className="mt-8 rounded-full bg-white px-8 py-4 font-bold text-zinc-950 shadow-lg transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95 cursor-pointer"
                >
                    Create your workspace
                </button>
            </section>

        </div>
    );
};
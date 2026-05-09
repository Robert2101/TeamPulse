import GradientBlinds from "../components/GradientBlinds";
import ScrollStack, { ScrollStackItem } from "../components/ScrollStack";

export const LandingPage = () => {
    const features = [
        { title: "Kanban Precision", description: "Manage tasks with clean drag-and-drop movement that syncs via WebSockets.", tag: "Workflow", color: "from-gray-100 to-white" },
        { title: "AI Assistant", description: "Ask for project summaries or help finding tasks directly in your dashboard.", tag: "Assistant", color: "from-gray-100 to-white" },
        { title: "Role-Based Access", description: "Admins, managers, and members see exactly what they need.", tag: "Security", color: "from-gray-100 to-white" },
        { title: "Audit History", description: "Activity logging helps you stay aligned across the team.", tag: "Reporting", color: "from-gray-100 to-white" }
    ];

    return (
        <div className="relative bg-gray-50 text-gray-900 selection:bg-gray-200 overflow-hidden">

            {/* --- HERO SECTION --- */}
            <section className="relative flex h-screen flex-col items-center justify-center px-4 overflow-hidden bg-gray-50">

                {/*  Interactive Gradient Blinds Background  */}
                <div className="absolute inset-0 w-full h-full z-0 opacity-40">
                    <GradientBlinds
                        gradientColors={['#E5E7EB', '#F3F4F6', '#E5E7EB']} // neutral grays
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
                <div className="absolute -top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-gray-200/60 blur-[120px] pointer-events-none z-0" />
                <div className="absolute top-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-gray-200/40 blur-[100px] pointer-events-none z-0" />

                {/* --- THE TEXT CONTENT --- */}
                <div className="z-10 text-center pointer-events-none">

                    

                    <h1
                       
                       
                       
                        className="mb-6 text-6xl font-extrabold tracking-tighter md:text-8xl drop-shadow-2xl"
                    >
                        Team<span className="text-gray-900">Pulse</span>
                    </h1>

                    <p
                       
                       
                       
                        className="mx-auto mb-10 max-w-xl text-lg text-gray-700 md:text-xl font-medium drop-shadow-md"
                    >
                        Ditch the chaos. Experience project management that breathes with your team.
                    </p>

                    <div
                       
                       
                       
                        className="flex gap-4 justify-center pointer-events-auto"
                    >
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="rounded-full border border-gray-300 bg-white px-8 py-4 font-semibold text-gray-900 shadow-sm hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                            Get Started Free
                        </button>
                    </div>

                </div>
            </section>

            {/*  SCROLL STACK SECTION  */}
            <section className="relative h-screen bg-gray-50 w-full z-20 border-t border-gray-200">
                <ScrollStack
                    itemDistance={120}
                    itemScale={0.05}
                    itemStackDistance={40}
                    blurAmount={4} // Adds depth of field blur to the cards in the back
                    className="h-full w-full"
                >
                    <div className="text-center pt-20 pb-10">
                        <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Built for speed. <br /><span className="text-gray-400">Designed for scale.</span></h2>
                        <p className="mt-4 text-lg text-gray-500">Scroll to explore the core features.</p>
                    </div>

                    {features.map((feature, index) => (
                        <ScrollStackItem
                            key={index}
                            itemClassName={`bg-gradient-to-br ${feature.color} flex flex-col justify-between p-10 overflow-hidden border border-gray-200`}
                        >
                            <div className="relative z-10">
                                <span className="mb-4 inline-block rounded-full bg-gray-50/50 border border-gray-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-700 backdrop-blur-md">
                                    {feature.tag}
                                </span>
                                <h3 className="mb-4 text-4xl font-bold text-gray-900">{feature.title}</h3>
                                <p className="text-xl text-gray-700 leading-relaxed max-w-lg">{feature.description}</p>
                            </div>
                        </ScrollStackItem>
                    ))}
                </ScrollStack>
            </section>

            {/* --- FOOTER --- */}
            <section className="flex h-[50vh] flex-col items-center justify-center border-t border-gray-200 bg-gray-50 z-10">
                <h2 className="text-3xl font-bold text-gray-900">Ready to take control?</h2>
                <button
                    onClick={() => window.location.href = '/register'}
                    className="mt-8 rounded-full border border-gray-300 bg-white px-8 py-4 font-semibold text-gray-900 shadow-sm hover:bg-gray-100 transition-colors cursor-pointer"
                >
                    Create your workspace
                </button>
            </section>

        </div>
    );
};
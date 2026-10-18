import { useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { gsap, useGSAP, EASE_OUT } from "../lib/motion";
import GradientBlinds from "../components/GradientBlinds";
import ScrollStack, { ScrollStackItem } from "../components/ScrollStack";
import { btn } from "../lib/styles";

const features = [
    { title: "Kanban Precision", description: "Manage tasks with clean drag-and-drop movement that syncs via WebSockets.", tag: "Workflow" },
    { title: "AI Assistant", description: "Ask for project summaries or help finding tasks directly in your dashboard.", tag: "Assistant" },
    { title: "Role-Based Access", description: "Admins, managers, and members see exactly what they need.", tag: "Security" },
    { title: "Audit History", description: "Activity logging helps you stay aligned across the team.", tag: "Reporting" }
];

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const FeatureBody = ({ feature }) => (
    <div className="relative z-10">
        <span className="mb-4 inline-block rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
            {feature.tag}
        </span>
        <h3 className="mb-3 text-2xl font-semibold tracking-tight text-gray-900 sm:mb-4 sm:text-4xl">{feature.title}</h3>
        <p className="max-w-lg text-base leading-relaxed text-gray-700 sm:text-xl">{feature.description}</p>
    </div>
);

export const LandingPage = () => {
    const navigate = useNavigate();
    const reduceMotion = prefersReducedMotion();
    const heroRef = useRef(null);

    // Focal moment: the name rises out of a mask, then a single heartbeat is drawn beneath it.
    useGSAP(() => {
        if (reduceMotion) return;
        const pulse = heroRef.current.querySelector("[data-pulse-line]");
        const length = pulse.getTotalLength();
        gsap.timeline({ defaults: { ease: EASE_OUT } })
            .from("[data-hero-char]", { yPercent: 110, duration: 0.9, stagger: 0.035 })
            .fromTo(pulse, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, "-=0.45")
            .from("[data-hero-fade]", { opacity: 0, y: 14, duration: 0.7, stagger: 0.08 }, "-=0.8");
    }, { scope: heroRef });

    return (
        <div className="relative bg-gray-50 text-gray-900 selection:bg-gray-200">

            {/* --- TOP BAR --- */}
            <header className="absolute inset-x-0 top-0 z-30">
                <nav aria-label="Primary" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                    <Link to="/" className="flex items-center gap-2.5 rounded-lg">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900">
                            <span className="h-2.5 w-2.5 rounded-full bg-white" />
                        </span>
                        <span className="text-lg font-semibold tracking-tight">TeamPulse</span>
                    </Link>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <Link to="/login" className={`${btn.ghost} text-gray-800 hover:bg-white/70`}>Sign in</Link>
                        <Link to="/register" className={`${btn.primary} hidden sm:inline-flex`}>Get started</Link>
                    </div>
                </nav>
            </header>

            {/* --- HERO SECTION --- */}
            <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gray-50 px-4">

                {/*  Interactive Gradient Blinds Background  */}
                <div className="absolute inset-0 z-0 h-full w-full opacity-40" aria-hidden="true">
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
                <div className="pointer-events-none absolute -left-[10%] -top-[10%] z-0 h-125 w-125 rounded-full bg-gray-200/60 blur-[120px]" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-[10%] top-[20%] z-0 h-100 w-100 rounded-full bg-gray-200/40 blur-[100px]" aria-hidden="true" />

                {/* --- THE TEXT CONTENT --- */}
                <div ref={heroRef} className="pointer-events-none z-10 text-center">
                    <h1 aria-label="TeamPulse" className="overflow-hidden pb-2 text-6xl font-extrabold tracking-[-0.04em] drop-shadow-2xl md:text-8xl">
                        {[..."TeamPulse"].map((char, i) => (
                            <span key={i} data-hero-char aria-hidden="true" className="inline-block">{char}</span>
                        ))}
                    </h1>

                    {/* A single heartbeat: the "pulse" in TeamPulse */}
                    <svg viewBox="0 0 280 40" className="mx-auto mb-6 h-8 w-56 text-gray-900 md:h-10 md:w-72" fill="none" aria-hidden="true">
                        <path
                            data-pulse-line
                            d="M2 22 H96 L106 22 L114 8 L124 34 L133 14 L140 22 H278"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>

                    <p data-hero-fade className="mx-auto mb-10 max-w-xl text-lg font-medium text-gray-800 drop-shadow-md md:text-xl">
                        Ditch the chaos. Experience project management that breathes with your team.
                    </p>

                    <div data-hero-fade className="pointer-events-auto flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <button
                            onClick={() => navigate('/register')}
                            className="cursor-pointer rounded-full bg-gray-900 px-8 py-4 font-semibold text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.5)] transition-colors hover:bg-gray-800 active:translate-y-px"
                        >
                            Create your workspace
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="cursor-pointer rounded-full border border-gray-300 bg-white px-8 py-4 font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100 active:translate-y-px"
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </section>

            {/*  FEATURES  */}
            <section className="relative z-20 w-full border-t border-gray-200 bg-gray-50" aria-labelledby="features-heading">
                <div className="px-4 pb-4 pt-20 text-center">
                    <h2 id="features-heading" className="text-4xl font-bold tracking-tight md:text-5xl">Built for speed. <br /><span className="text-gray-500">Designed for scale.</span></h2>
                    <p className="mt-4 text-lg text-gray-600">Everything your team needs to ship, in one place.</p>
                </div>

                {reduceMotion ? (
                    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-12">
                        {features.map((feature) => (
                            <div key={feature.title} className="rounded-3xl border border-gray-200 bg-linear-to-br from-gray-100 to-white p-6 sm:p-10">
                                <FeatureBody feature={feature} />
                            </div>
                        ))}
                    </div>
                ) : (
                    // Window-scroll mode: the stack animates with the page instead of trapping the wheel in an inner scroller.
                    <ScrollStack
                        useWindowScroll
                        itemDistance={120}
                        itemScale={0.05}
                        itemStackDistance={40}
                        blurAmount={4} // Adds depth of field blur to the cards in the back
                        className="w-full"
                    >
                        {features.map((feature) => (
                            <ScrollStackItem
                                key={feature.title}
                                itemClassName="flex flex-col justify-between overflow-hidden border border-gray-200 bg-linear-to-br from-gray-100 to-white p-6 sm:p-10"
                            >
                                <FeatureBody feature={feature} />
                            </ScrollStackItem>
                        ))}
                    </ScrollStack>
                )}
            </section>

            {/* --- FOOTER --- */}
            <section className="relative z-10 flex min-h-[50vh] flex-col items-center justify-center border-t border-gray-200 bg-gray-50 px-4 py-20 text-center">
                <h2 className="text-3xl font-bold text-gray-900">Ready to take control?</h2>
                <p className="mt-3 max-w-md text-gray-600">Spin up a workspace in under a minute and invite your team with a single code.</p>
                <button
                    onClick={() => navigate('/register')}
                    className="mt-8 cursor-pointer rounded-full bg-gray-900 px-8 py-4 font-semibold text-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.5)] transition-colors hover:bg-gray-800 active:translate-y-px"
                >
                    Create your workspace
                </button>
                <p className="mt-6 text-sm text-gray-600">
                    Already on a team? <Link to="/login" className="font-medium text-gray-900 underline underline-offset-4">Sign in</Link>
                </p>
            </section>

        </div>
    );
};

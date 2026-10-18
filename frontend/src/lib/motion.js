import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, Flip);

// Shared motion vocabulary. Arrivals decelerate confidently; exits are quicker than entrances.
export const EASE_OUT = "expo.out";
export const EASE_IN = "power2.in";

export const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export { gsap, Flip, useGSAP };

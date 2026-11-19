import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

/**
 * Rises into place the first time it scrolls into view (opacity + 24px, strong ease-out).
 * `delay` staggers siblings. Reduced motion: the global rule shortens it to an instant change.
 */
export const Reveal = ({ as = "div", delay = 0, className, children, ...props }) => {
    const Tag = as;
    const ref = useRef(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || typeof IntersectionObserver === "undefined") {
            const id = requestAnimationFrame(() => setShown(true));
            return () => cancelAnimationFrame(id);
        }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setShown(true);
                observer.disconnect();
            }
        }, { rootMargin: "0px 0px -10% 0px" });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <Tag
            ref={ref}
            style={{ transitionDelay: `${delay}ms` }}
            className={cn(
                "transition-[opacity,transform] duration-700 ease-snappy",
                shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
                className
            )}
            {...props}
        >
            {children}
        </Tag>
    );
};

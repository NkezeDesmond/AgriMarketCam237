import { useEffect, useMemo, useRef, useState } from "react";

type UseInViewOptions = {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
};

export function useInView<T extends Element>(options: UseInViewOptions = {}) {
  const { root = null, rootMargin = "0px", threshold = 0.15, once = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  const isSupported = useMemo(() => typeof window !== "undefined" && "IntersectionObserver" in window, []);

  useEffect(() => {
    if (!isSupported) {
      setInView(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
          return;
        }
        if (!once) setInView(false);
      },
      { root, rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isSupported, once, root, rootMargin, threshold]);

  return { ref, inView } as const;
}

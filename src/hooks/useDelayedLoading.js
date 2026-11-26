import { useEffect, useRef, useState } from "react";

export default function useDelayedLoading(isLoading, delay = 200, minimumVisible = 300) {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isInitialPending, setIsInitialPending] = useState(true);
  const initialLoadFinished = useRef(false);
  const skeletonShownAt = useRef(null);

  useEffect(() => {
    if (initialLoadFinished.current) return undefined;

    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        skeletonShownAt.current = Date.now();
        setShowSkeleton(true);
      }, delay);
    } else {
      initialLoadFinished.current = true;
      const visibleFor = skeletonShownAt.current === null
        ? minimumVisible
        : Date.now() - skeletonShownAt.current;
      const remaining = skeletonShownAt.current === null
        ? 0
        : Math.max(0, minimumVisible - visibleFor);

      if (remaining === 0) {
        setShowSkeleton(false);
        setIsInitialPending(false);
      } else {
        timer = setTimeout(() => {
          setShowSkeleton(false);
          setIsInitialPending(false);
        }, remaining);
      }
    }

    return () => clearTimeout(timer);
  }, [isLoading, delay, minimumVisible]);

  return { showSkeleton, isInitialPending };
}

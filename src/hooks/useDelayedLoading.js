import { useEffect, useRef, useState } from "react";

export default function useDelayedLoading(isLoading, delay = 200, minimumVisible = 300) {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isInitialPending, setIsInitialPending] = useState(true);
  const finished = useRef(false);
  const shownAt = useRef(null);
  const showTimer = useRef(null);
  const hideTimer = useRef(null);

  useEffect(() => {
    if (finished.current) return;

    if (isLoading) {
      if (showTimer.current === null) {
        showTimer.current = setTimeout(() => {
          showTimer.current = null;
          shownAt.current = Date.now();
          setShowSkeleton(true);
        }, delay);
      }
      return;
    }

    finished.current = true;
    clearTimeout(showTimer.current);
    showTimer.current = null;

    const remaining = shownAt.current === null
      ? 0
      : Math.max(0, minimumVisible - (Date.now() - shownAt.current));

    const finish = () => {
      hideTimer.current = null;
      setShowSkeleton(false);
      setIsInitialPending(false);
    };

    if (remaining === 0) finish();
    else hideTimer.current = setTimeout(finish, remaining);
  }, [isLoading, delay, minimumVisible]);

  // Bersihkan timer hanya saat komponen dilepas (bukan tiap isLoading berubah).
  useEffect(() => () => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    showTimer.current = null;
    hideTimer.current = null;
  }, []);

  return { showSkeleton, isInitialPending };
}
"use client";

import { useEffect, useState } from "react";

export function useMobileGameHeader(enabled: boolean) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }

    const media = window.matchMedia("(max-width: 1023px)");
    const main = document.querySelector<HTMLElement>(".app-shell-main");
    if (!main) return;

    let startX = 0;
    let startY = 0;
    let startScrollTop = 0;
    let tracking = false;

    const activePanel = () => document.querySelector<HTMLElement>(
      ".mobile-game-scroll-panel, .fast-track-tab-panel:not([hidden])"
    );
    const onStart = (event: TouchEvent) => {
      tracking = event.touches.length === 1;
      if (!tracking) return;
      startX = event.touches[0]!.clientX;
      startY = event.touches[0]!.clientY;
      startScrollTop = activePanel()?.scrollTop ?? 0;
    };
    const onEnd = (event: TouchEvent) => {
      if (!tracking || !media.matches || event.changedTouches.length !== 1) return;
      tracking = false;
      const deltaX = event.changedTouches[0]!.clientX - startX;
      const deltaY = event.changedTouches[0]!.clientY - startY;
      if (Math.abs(deltaY) < 36 || Math.abs(deltaY) < Math.abs(deltaX) * 1.3) return;
      if (deltaY < 0 && !hidden) setHidden(true);
      if (deltaY > 0 && hidden && startScrollTop <= 1 && (activePanel()?.scrollTop ?? 0) <= 1) {
        setHidden(false);
      }
    };
    const onViewportChange = () => { if (!media.matches) setHidden(false); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && hidden && media.matches) setHidden(false);
    };

    main.addEventListener("touchstart", onStart, { passive: true });
    main.addEventListener("touchend", onEnd, { passive: true });
    main.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onViewportChange);
    return () => {
      main.removeEventListener("touchstart", onStart);
      main.removeEventListener("touchend", onEnd);
      main.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onViewportChange);
    };
  }, [enabled, hidden]);

  return hidden;
}

"use client";

import { useRef } from "react";

export const OPEN_COOKIE_SETTINGS_EVENT = "fj:open-cookie-settings";

export function CookieSettingsLink({ className }: { className?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  function openSettings() {
    window.dispatchEvent(
      new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT, {
        detail: { opener: buttonRef.current }
      })
    );
  }

  return (
    <button ref={buttonRef} type="button" className={`cookie-settings-link${className ? ` ${className}` : ""}`} onClick={openSettings}>
      Настройки cookies
    </button>
  );
}

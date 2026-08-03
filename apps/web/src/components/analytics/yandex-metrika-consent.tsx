"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  ANALYTICS_CONSENT_KEY,
  createAnalyticsConsent,
  parseAnalyticsConsent,
  removeAccessibleYandexCookies,
  type AnalyticsConsent
} from "./consent-storage";
import { OPEN_COOKIE_SETTINGS_EVENT } from "./cookie-settings-link";

const COUNTER_ID = 111257575;

type MetrikaWindow = Window & {
  ym?: (counterId: number, method: string, options?: Record<string, unknown>) => void;
};

function initializeExistingCounter() {
  (window as MetrikaWindow).ym?.(COUNTER_ID, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true
  });
}

function stopCounter() {
  (window as MetrikaWindow).ym?.(COUNTER_ID, "destruct");
}

export function YandexMetrikaConsent() {
  const [consent, setConsent] = useState<AnalyticsConsent | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const consentHeadingRef = useRef<HTMLHeadingElement>(null);
  const settingsOpenerRef = useRef<HTMLElement | null>(null);
  const restoreAfterChoiceRef = useRef(false);

  useEffect(() => {
    try {
      setConsent(parseAnalyticsConsent(localStorage.getItem(ANALYTICS_CONSENT_KEY)));
    } catch {
      setConsent(null);
    }
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== ANALYTICS_CONSENT_KEY) return;
      const nextConsent = parseAnalyticsConsent(event.newValue);

      if (consent?.analytics && nextConsent?.analytics !== true) {
        stopCounter();
        removeAccessibleYandexCookies();
      } else if (!consent?.analytics && nextConsent?.analytics) {
        initializeExistingCounter();
      }

      setConsent(nextConsent);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [consent?.analytics]);

  useEffect(() => {
    function handleOpenSettings(event: Event) {
      const customEvent = event as CustomEvent<{ opener?: HTMLElement | null }>;
      settingsOpenerRef.current = customEvent.detail?.opener ?? null;
      setSettingsOpen(true);
    }

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleOpenSettings);
  }, []);

  useEffect(() => {
    if (settingsOpen) {
      consentHeadingRef.current?.focus();
      return;
    }

    if (settingsOpenerRef.current) {
      const opener = settingsOpenerRef.current;
      settingsOpenerRef.current = null;
      restoreAfterChoiceRef.current = false;
      opener.focus();
      return;
    }

    if (restoreAfterChoiceRef.current) {
      restoreAfterChoiceRef.current = false;
      document.querySelector<HTMLElement>("main a, main button, main [tabindex]:not([tabindex='-1'])")?.focus();
    }
  }, [settingsOpen, consent]);

  function saveChoice(analytics: boolean) {
    restoreAfterChoiceRef.current = true;
    const nextConsent = createAnalyticsConsent(analytics);
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify(nextConsent));
    } catch {
      // The current-page choice still works when storage is unavailable.
    }

    if (!analytics) {
      stopCounter();
      removeAccessibleYandexCookies();
      setConsent(nextConsent);
      setSettingsOpen(false);
      return;
    }

    if (!consent?.analytics) initializeExistingCounter();
    setConsent(nextConsent);
    setSettingsOpen(false);
  }

  const shouldAsk = consent === null || settingsOpen;

  return (
    <>
      {consent?.analytics && (
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}','ym');
            ym(${COUNTER_ID},'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`}
        </Script>
      )}

      {consent !== undefined && shouldAsk && (
        <section className="cookie-consent" aria-labelledby="cookie-consent-title" aria-live="polite">
          <div>
            <h2 id="cookie-consent-title" ref={consentHeadingRef} tabIndex={-1}>Настройте аналитику</h2>
            <p>
              Мы используем необходимые cookies для работы аккаунта. С вашего разрешения Яндекс Метрика поможет понять, как улучшить сайт, включая карту кликов и Webvisor. Подробнее — в <Link href="/privacy">политике обработки данных</Link>.
            </p>
          </div>
          <div className="cookie-consent-actions">
            <button type="button" className="cookie-button cookie-button-secondary" onClick={() => saveChoice(false)}>
              Только необходимые
            </button>
            <button type="button" className="cookie-button cookie-button-primary" onClick={() => saveChoice(true)}>
              Разрешить аналитику
            </button>
          </div>
        </section>
      )}
    </>
  );
}

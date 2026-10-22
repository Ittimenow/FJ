"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicApiBaseUrl } from "@/lib/api";

const USER_KEY = "financial-journey-push-user";

function isIosBrowser() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.matchMedia("(display-mode: standalone)").matches &&
    !(navigator as Navigator & { standalone?: boolean }).standalone;
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=")
    .replaceAll("-", "+").replaceAll("_", "/");
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  return new Uint8Array(bytes);
}

export async function removeDevicePushSubscription(token: string) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4_000);
  try {
    await fetch(`${publicApiBaseUrl()}/api/users/me/push/subscription`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeout);
    await subscription.unsubscribe();
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("push:subscription-changed"));
  }
}

export function PushNotificationSettings({ token, userId }: { token: string; userId: string }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "available" | "enabled" | "install" | "denied" | "unsupported" | "unavailable">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (isIosBrowser()) {
        setStatus("install");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      try {
        const response = await fetch(`${publicApiBaseUrl()}/api/users/me/push/config`, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
        });
        if (!response.ok) throw new Error("Не удалось проверить настройки устройства.");
        const config = await response.json() as { publicKey: string | null };
        if (!active) return;
        if (!config.publicKey) {
          setStatus("unavailable");
          return;
        }
        setPublicKey(config.publicKey);
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (!active) return;
        const previousUser = localStorage.getItem(USER_KEY);
        if (subscription && previousUser !== userId) {
          await subscription.unsubscribe();
          localStorage.removeItem(USER_KEY);
          setStatus(Notification.permission === "denied" ? "denied" : "available");
          return;
        }
        setStatus(subscription ? "enabled" : Notification.permission === "denied" ? "denied" : "available");
      } catch {
        if (active) setStatus("unavailable");
      }
    })();
    return () => { active = false; };
  }, [token, userId]);

  async function enable() {
    if (!publicKey || busy) return;
    setBusy(true);
    setError(null);
    try {
      // iOS requires the permission prompt to start directly from this click.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "available");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const created = !subscription;
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey)
      });
      const json = subscription.toJSON();
      const response = await fetch(`${publicApiBaseUrl()}/api/users/me/push/subscription`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: subscription.endpoint, keys: json.keys })
      });
      if (!response.ok) {
        if (created) await subscription.unsubscribe();
        throw new Error("Не удалось сохранить подписку на устройстве.");
      }
      localStorage.setItem(USER_KEY, userId);
      setStatus("enabled");
      window.dispatchEvent(new Event("push:subscription-changed"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось включить уведомления.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await removeDevicePushSubscription(token);
      setStatus("available");
    } catch {
      setError("Не удалось отключить уведомления. Повторите попытку.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-white p-3 text-sm text-ink">
      <strong className="block">На этом устройстве</strong>
      {status === "checking" ? <p className="mt-1 text-xs text-muted">Проверяем поддержку push-уведомлений…</p> : null}
      {status === "install" ? <p className="mt-1 text-xs leading-5 text-muted">На iPhone добавьте сайт через «Поделиться» → «На экран Домой», затем откройте установленное приложение.</p> : null}
      {status === "unsupported" ? <p className="mt-1 text-xs text-muted">Этот браузер не поддерживает push-уведомления.</p> : null}
      {status === "unavailable" ? <p className="mt-1 text-xs text-muted">Push-уведомления сейчас недоступны.</p> : null}
      {status === "denied" ? <p className="mt-1 text-xs text-muted">Разрешите уведомления для приложения в настройках устройства.</p> : null}
      {status === "enabled" ? <p className="mt-1 text-xs text-muted">Системные уведомления включены на этом устройстве.</p> : null}
      {status === "available" ? <p className="mt-1 text-xs text-muted">Получайте сообщения о новых играх и изменениях ваших партий, даже когда приложение закрыто.</p> : null}
      {status === "available" || status === "enabled" ? (
        <Button type="button" disabled={busy} onClick={() => void (status === "enabled" ? disable() : enable())}
          className="mt-3">
          {busy ? "Подождите…" : status === "enabled" ? "Отключить на устройстве" : "Включить на устройстве"}
        </Button>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

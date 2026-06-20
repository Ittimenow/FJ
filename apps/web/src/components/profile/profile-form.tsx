"use client";

import { FormEvent, useState } from "react";
import { AvatarPicker } from "@/components/profile/avatar-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { avatarInitials } from "@/lib/avatar-color";
import type { ProfileResponse } from "@/lib/types";

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

interface ProfileFormProps {
  profile: ProfileResponse;
  token: string;
}

export function ProfileForm({ profile, token }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile.user.displayName);
  const [gender, setGender] = useState(profile.user.gender ?? "");
  const [birthDate, setBirthDate] = useState(toDateInputValue(profile.user.birthDate));
  const [gameExperience, setGameExperience] = useState(
    profile.user.gameExperience != null ? String(profile.user.gameExperience) : ""
  );
  const [avatarPending, setAvatarPending] = useState<string | null | undefined>(undefined);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const avatarColor = profile.user.avatarColor ?? "#64748b";
  const initials = avatarInitials(displayName || profile.user.displayName);
  const currentAvatarUrl = avatarPending === undefined ? profile.user.avatarUrl : avatarPending;
  const computedAge = calcAge(birthDate);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      if (avatarPending !== undefined) {
        if (avatarPending === null) {
          const res = await fetch(`${publicApiBaseUrl()}/api/users/me/avatar`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Не удалось удалить аватар");
        } else {
          const res = await fetch(`${publicApiBaseUrl()}/api/users/me/avatar`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ avatarDataUrl: avatarPending })
          });
          if (!res.ok) throw new Error("Не удалось загрузить аватар");
        }
      }

      const body: Record<string, unknown> = {};
      if (displayName.trim() !== profile.user.displayName)
        body.displayName = displayName.trim();
      if (gender !== (profile.user.gender ?? ""))
        body.gender = gender || null;
      const origBirth = toDateInputValue(profile.user.birthDate);
      if (birthDate !== origBirth)
        body.birthDate = birthDate || null;
      const expNum = gameExperience !== "" ? Number(gameExperience) : null;
      if (expNum !== (profile.user.gameExperience ?? null))
        body.gameExperience = expNum;

      if (Object.keys(body).length > 0) {
        const res = await fetch(`${publicApiBaseUrl()}/api/users/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || "Не удалось обновить профиль");
        }
      }

      setAvatarPending(undefined);
      setProfileMsg({ ok: true, text: "Профиль сохранён" });
    } catch (err) {
      setProfileMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Ошибка сохранения"
      });
    } finally {
      setProfileLoading(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "Пароли не совпадают" });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${publicApiBaseUrl()}/api/users/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { message?: string }).message ?? "Ошибка смены пароля"
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwOpen(false);
      setPasswordMsg({ ok: true, text: "Пароль изменён. На вашу почту отправлено уведомление." });
    } catch (err) {
      setPasswordMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Ошибка смены пароля"
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-6">
            <AvatarPicker
              currentAvatarUrl={currentAvatarUrl ?? null}
              avatarColor={avatarColor}
              initials={initials}
              onAvatarChange={(dataUrl) => setAvatarPending(dataUrl)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Имя</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={1}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">Email</label>
                <Input
                  value={profile.user.email}
                  disabled
                  className="cursor-not-allowed bg-surface text-neutral-500"
                />
                <p className="text-xs text-neutral-400">Email изменить нельзя</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Пол{" "}
                  <span className="font-normal text-neutral-400">(необязательно)</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm outline-none transition focus:border-ink"
                >
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Дата рождения{" "}
                  <span className="font-normal text-neutral-400">(необязательно)</span>
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="flex-1"
                  />
                  {computedAge !== null && (
                    <span className="shrink-0 rounded-md border border-line bg-surface px-3 py-2 text-sm text-neutral-600">
                      {computedAge} лет
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Опыт игры, лет{" "}
                  <span className="font-normal text-neutral-400">(необязательно)</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={gameExperience}
                  onChange={(e) => setGameExperience(e.target.value)}
                  placeholder="Сколько лет вы играете?"
                />
              </div>
            </div>

            {profileMsg && (
              <p className={`text-sm ${profileMsg.ok ? "text-green-700" : "text-red-700"}`}>
                {profileMsg.text}
              </p>
            )}

            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? "Сохранение..." : "Сохранить профиль"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {!pwOpen ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Пароль</p>
                <p className="text-xs text-neutral-400">Изменить пароль аккаунта</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPwOpen(true);
                  setPasswordMsg(null);
                }}
              >
                Изменить пароль
              </Button>
            </div>
          ) : (
            <form onSubmit={changePassword} className="space-y-4 max-w-sm">
              <p className="text-sm font-medium">Изменить пароль</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Текущий пароль
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Новый пароль
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-neutral-700">
                  Повторите новый пароль
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {passwordMsg && (
                <p className={`text-sm ${passwordMsg.ok ? "text-green-700" : "text-red-700"}`}>
                  {passwordMsg.text}
                </p>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? "Сохранение..." : "Сохранить пароль"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setPwOpen(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordMsg(null);
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          )}

          {!pwOpen && passwordMsg?.ok && (
            <p className="mt-3 text-sm text-green-700">{passwordMsg.text}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

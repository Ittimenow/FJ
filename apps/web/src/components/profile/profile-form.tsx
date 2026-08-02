"use client";

import { CheckCircle2, KeyRound, LayoutGrid, LogOut, Map, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FigurinePicker } from "@/components/figurine-picker";
import { AvatarPicker } from "@/components/profile/avatar-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { avatarInitials } from "@/lib/avatar-color";
import { userRoleLabels, userStatusLabels } from "@/lib/game-labels";
import type { ProfileResponse } from "@/lib/types";

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }
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
  const router = useRouter();
  const [savedProfile, setSavedProfile] = useState(() => ({
    displayName: profile.user.displayName,
    gender: profile.user.gender ?? "",
    birthDate: toDateInputValue(profile.user.birthDate),
    gameExperience:
      profile.user.gameExperience != null ? Number(profile.user.gameExperience) : null,
    avatarUrl: profile.user.avatarUrl,
    figurine: profile.user.figurine,
    gameRoomView: profile.user.gameRoomView
  }));
  const [displayName, setDisplayName] = useState(profile.user.displayName);
  const [gender, setGender] = useState(profile.user.gender ?? "");
  const [birthDate, setBirthDate] = useState(toDateInputValue(profile.user.birthDate));
  const [gameExperience, setGameExperience] = useState(
    profile.user.gameExperience != null ? String(profile.user.gameExperience) : ""
  );
  const [avatarPending, setAvatarPending] = useState<string | null | undefined>(undefined);
  const [figurine, setFigurine] = useState<string | null>(profile.user.figurine);
  const [gameRoomView, setGameRoomView] = useState<"classic" | "journey">(
    profile.user.gameRoomView
  );
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const avatarColor = profile.user.avatarColor ?? "#657597";
  const initials = avatarInitials(displayName || profile.user.displayName);
  const currentAvatarUrl = avatarPending === undefined ? savedProfile.avatarUrl : avatarPending;
  const computedAge = calcAge(birthDate || null);
  const normalizedDisplayName = displayName.trim();
  const normalizedGameExperience = gameExperience === "" ? null : Number(gameExperience);
  const displayNameValid = normalizedDisplayName.length > 0;
  const gameExperienceValid =
    normalizedGameExperience === null ||
    (Number.isInteger(normalizedGameExperience) &&
      normalizedGameExperience >= 0 &&
      normalizedGameExperience <= 100);
  const profileFormValid = displayNameValid && gameExperienceValid;
  const hasAvatarChanges =
    avatarPending !== undefined && avatarPending !== savedProfile.avatarUrl;
  const hasProfileChanges =
    hasAvatarChanges ||
    normalizedDisplayName !== savedProfile.displayName ||
    gender !== savedProfile.gender ||
    birthDate !== savedProfile.birthDate ||
    normalizedGameExperience !== savedProfile.gameExperience ||
    figurine !== savedProfile.figurine ||
    gameRoomView !== savedProfile.gameRoomView;
  const visibleProfileMsg =
    profileMsg?.ok && hasProfileChanges ? null : profileMsg;
  const passwordsMatch = newPassword === confirmPassword;
  const passwordFormValid =
    currentPassword.length > 0 && newPassword.length >= 8 && passwordsMatch;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasProfileChanges || profileLoading) return;
    if (!profileFormValid) {
      setProfileMsg({
        ok: false,
        text: "Проверьте имя и опыт игры перед сохранением."
      });
      return;
    }

    setProfileLoading(true);
    setProfileMsg(null);

    try {
      if (hasAvatarChanges) {
        if (avatarPending === null) {
          const response = await fetch(`${publicApiBaseUrl()}/api/users/me/avatar`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) {
            throw new Error(await responseMessage(response, "Не удалось удалить фотографию"));
          }
        } else if (avatarPending) {
          const response = await fetch(`${publicApiBaseUrl()}/api/users/me/avatar`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ avatarDataUrl: avatarPending })
          });
          if (!response.ok) {
            throw new Error(await responseMessage(response, "Не удалось загрузить фотографию"));
          }
        }
      }

      const body: Record<string, unknown> = {};
      if (normalizedDisplayName !== savedProfile.displayName) {
        body.displayName = normalizedDisplayName;
      }
      if (gender !== savedProfile.gender) body.gender = gender || null;
      if (birthDate !== savedProfile.birthDate) body.birthDate = birthDate || null;
      if (normalizedGameExperience !== savedProfile.gameExperience) {
        body.gameExperience = normalizedGameExperience;
      }
      if (figurine !== savedProfile.figurine) body.figurine = figurine;
      if (gameRoomView !== savedProfile.gameRoomView) body.gameRoomView = gameRoomView;

      if (Object.keys(body).length > 0) {
        const response = await fetch(`${publicApiBaseUrl()}/api/users/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          throw new Error(await responseMessage(response, "Не удалось обновить профиль"));
        }
      }

      const nextAvatarUrl = hasAvatarChanges
        ? avatarPending ?? null
        : savedProfile.avatarUrl;
      setSavedProfile({
        displayName: normalizedDisplayName,
        gender,
        birthDate,
        gameExperience: normalizedGameExperience,
        avatarUrl: nextAvatarUrl,
        figurine,
        gameRoomView
      });
      setDisplayName(normalizedDisplayName);
      setAvatarPending(undefined);
      setProfileMsg({ ok: true, text: "Изменения сохранены" });
      router.refresh();
    } catch (error) {
      setProfileMsg({
        ok: false,
        text: error instanceof Error ? error.message : "Не удалось сохранить изменения"
      });
    } finally {
      setProfileLoading(false);
    }
  }

  function discardProfileChanges() {
    setDisplayName(savedProfile.displayName);
    setGender(savedProfile.gender);
    setBirthDate(savedProfile.birthDate);
    setGameExperience(
      savedProfile.gameExperience === null ? "" : String(savedProfile.gameExperience)
    );
    setAvatarPending(undefined);
    setFigurine(savedProfile.figurine);
    setGameRoomView(savedProfile.gameRoomView);
    setProfileMsg(null);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMsg(null);

    if (!passwordsMatch) {
      setPasswordMsg({ ok: false, text: "Новые пароли не совпадают" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ ok: false, text: "Новый пароль должен содержать минимум 8 символов" });
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/users/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        throw new Error(await responseMessage(response, "Не удалось изменить пароль"));
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      setPasswordMsg({
        ok: true,
        text: "Пароль изменён. Уведомление отправлено на вашу почту."
      });
    } catch (error) {
      setPasswordMsg({
        ok: false,
        text: error instanceof Error ? error.message : "Не удалось изменить пароль"
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  function closePasswordForm() {
    setPasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg(null);
  }

  async function endSession() {
    setSignOutLoading(true);
    await signOut({ redirectTo: "/login" });
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deletePassword.length < 8) {
      setDeleteError("Введите текущий пароль.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/users/me/personal-data`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: deletePassword })
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Не удалось удалить аккаунт"));
      await signOut({ redirectTo: "/" });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Не удалось удалить аккаунт");
      setDeleteLoading(false);
    }
  }

  return (
    <div className="grid gap-5 sm:gap-6">
      <form
        id="profile-form"
        className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6"
        onSubmit={saveProfile}
        aria-busy={profileLoading}
      >
        <aside className="rounded-2xl bg-ink p-5 text-white shadow-panel lg:sticky lg:top-28 sm:p-6">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
            Так вас увидят игроки
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Фигурка имеет приоритет над фотографией. Если её снять, снова появится фото или инициалы.
          </p>

          <div className="mt-6">
            <AvatarPicker
              currentAvatarUrl={currentAvatarUrl ?? null}
              avatarColor={avatarColor}
              initials={initials}
              figurine={figurine}
              onAvatarChange={setAvatarPending}
            />
          </div>

          <div className="mt-6 border-t border-white/10 pt-5 text-center lg:text-left">
            <div className="truncate text-xl font-extrabold">
              {normalizedDisplayName || "Имя игрока"}
            </div>
            <div className="mt-1 truncate text-sm text-white/55">{profile.user.email}</div>
            <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-extrabold text-white">
                {userRoleLabels[profile.user.role] ?? profile.user.role}
              </span>
              <span className="rounded-lg bg-[#eaf3e0] px-2.5 py-1 text-xs font-extrabold text-success">
                {userStatusLabels[profile.user.status] ?? profile.user.status}
              </span>
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-panel">
          <div className="flex flex-col gap-4 border-b border-line/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Профиль игрока</h2>
              <ProfileStatus
                message={visibleProfileMsg}
                hasChanges={hasProfileChanges}
              />
            </div>
            <SaveProfileButton
              loading={profileLoading}
              disabled={!hasProfileChanges || !profileFormValid}
            />
          </div>

          <div className="p-5 sm:p-6">
            <section aria-labelledby="figurine-heading">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl">
                  <h3 id="figurine-heading" className="text-lg font-extrabold">
                    Любимая фигурка
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Она будет показываться в профиле и использоваться как предпочтительный выбор в новых партиях.
                  </p>
                </div>
                {figurine ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 shrink-0 px-3 text-xs"
                    onClick={() => setFigurine(null)}
                  >
                    Показывать фото
                  </Button>
                ) : null}
              </div>
              <div className="mt-4 rounded-2xl bg-card p-3 sm:p-4">
                <FigurinePicker value={figurine} onChange={setFigurine} />
              </div>
            </section>

            <section className="mt-7 border-t border-line/70 pt-7" aria-labelledby="game-board-heading">
              <div className="max-w-xl">
                <h3 id="game-board-heading" className="text-lg font-extrabold">
                  Дизайн игрового поля
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Выбранный вариант будет открываться во всех ваших партиях.
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Дизайн игрового поля">
                <GameBoardChoice
                  value="classic"
                  label="Поле 1"
                  description="Классическое круговое поле"
                  selected={gameRoomView === "classic"}
                  onSelect={setGameRoomView}
                />
                <GameBoardChoice
                  value="journey"
                  label="Поле 2"
                  description="Карта финансового путешествия"
                  selected={gameRoomView === "journey"}
                  onSelect={setGameRoomView}
                />
              </div>
            </section>

            <section className="mt-7 border-t border-line/70 pt-7" aria-labelledby="personal-heading">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8effe] text-journey" aria-hidden="true">
                  <UserRound size={19} />
                </span>
                <div>
                  <h3 id="personal-heading" className="text-lg font-extrabold">
                    Персональные данные
                  </h3>
                  <p className="mt-0.5 text-sm text-muted">
                    Необязательные данные помогают ведущему лучше узнать команду.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="profile-name" className="text-sm font-extrabold text-ink">
                    Имя в игре
                  </label>
                  <Input
                    id="profile-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                    maxLength={80}
                    autoComplete="name"
                    aria-invalid={!displayNameValid}
                    aria-describedby={!displayNameValid ? "profile-name-error" : undefined}
                    className="h-12"
                  />
                  {!displayNameValid ? (
                    <p id="profile-name-error" className="text-xs text-red-700">
                      Введите имя, которое увидят другие игроки.
                    </p>
                  ) : (
                    <p className="text-xs text-muted">До 80 символов.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-email" className="text-sm font-extrabold text-ink">
                    Email
                  </label>
                  <Input
                    id="profile-email"
                    value={profile.user.email}
                    disabled
                    className="h-12 cursor-not-allowed bg-card text-muted disabled:opacity-100"
                  />
                  <p className="text-xs text-muted">Используется для входа и не изменяется в профиле.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-gender" className="text-sm font-extrabold text-ink">
                    Пол <span className="font-normal text-muted">(необязательно)</span>
                  </label>
                  <select
                    id="profile-gender"
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    className="h-12 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
                  >
                    <option value="">Не указан</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="profile-birth-date" className="text-sm font-extrabold text-ink">
                    Дата рождения <span className="font-normal text-muted">(необязательно)</span>
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <Input
                      id="profile-birth-date"
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      className="h-12 min-w-0"
                    />
                    {computedAge !== null ? (
                      <span className="inline-flex h-12 items-center rounded-lg bg-card px-3 text-sm font-bold text-muted">
                        {computedAge} {yearsWord(computedAge)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2 sm:max-w-[calc(50%_-_0.625rem)]">
                  <label htmlFor="profile-experience" className="text-sm font-extrabold text-ink">
                    Опыт игры, лет <span className="font-normal text-muted">(необязательно)</span>
                  </label>
                  <Input
                    id="profile-experience"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    value={gameExperience}
                    onChange={(event) => setGameExperience(event.target.value)}
                    placeholder="Например, 2"
                    aria-invalid={!gameExperienceValid}
                    aria-describedby="profile-experience-hint"
                    className="h-12"
                  />
                  <p
                    id="profile-experience-hint"
                    className={`text-xs ${gameExperienceValid ? "text-muted" : "text-red-700"}`}
                  >
                    {gameExperienceValid
                      ? "Укажите целое число от 0 до 100."
                      : "Опыт должен быть целым числом от 0 до 100."}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-line/70 bg-card/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <Button
              type="button"
              variant="ghost"
              className="sm:justify-start"
              disabled={!hasProfileChanges || profileLoading}
              onClick={discardProfileChanges}
            >
              Отменить изменения
            </Button>
            <SaveProfileButton
              loading={profileLoading}
              disabled={!hasProfileChanges || !profileFormValid}
              className="sm:min-w-52"
            />
          </div>
        </section>
      </form>

      <section className="overflow-hidden rounded-2xl bg-white shadow-panel" aria-labelledby="security-heading">
        <div className="flex items-start gap-3 border-b border-line/70 p-5 sm:p-6">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e8effe] text-journey" aria-hidden="true">
            <ShieldCheck size={21} />
          </span>
          <div>
            <h2 id="security-heading" className="text-2xl font-extrabold tracking-[-0.03em]">
              Безопасность аккаунта
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Управляйте паролем и текущим сеансом отдельно от игрового профиля.
            </p>
          </div>
        </div>

        <div className="divide-y divide-line/70">
          <div className="p-5 sm:p-6">
            {!passwordOpen ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 shrink-0 text-muted" size={20} aria-hidden="true" />
                  <div>
                    <h3 className="font-extrabold">Пароль</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Используйте не менее восьми символов и не повторяйте пароль от почты.
                    </p>
                    {passwordMsg ? (
                      <p
                        className={`mt-2 text-sm ${passwordMsg.ok ? "text-success" : "text-red-700"}`}
                        role={passwordMsg.ok ? "status" : "alert"}
                      >
                        {passwordMsg.text}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  aria-expanded={passwordOpen}
                  onClick={() => {
                    setPasswordOpen(true);
                    setPasswordMsg(null);
                  }}
                >
                  Изменить пароль
                </Button>
              </div>
            ) : (
              <form onSubmit={changePassword} className="max-w-2xl" aria-busy={passwordLoading}>
                <h3 className="text-lg font-extrabold">Новый пароль</h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  После изменения мы отправим уведомление на {profile.user.email}.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2 sm:max-w-[calc(50%_-_0.5rem)]">
                    <label htmlFor="current-password" className="text-sm font-extrabold text-ink">
                      Текущий пароль
                    </label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                      autoComplete="current-password"
                      autoFocus
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="text-sm font-extrabold text-ink">
                      Новый пароль
                    </label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      aria-describedby="new-password-hint"
                      className="h-12"
                    />
                    <p id="new-password-hint" className="text-xs text-muted">
                      Минимум 8 символов.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="text-sm font-extrabold text-ink">
                      Повторите новый пароль
                    </label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                      aria-describedby={confirmPassword.length > 0 && !passwordsMatch ? "confirm-password-error" : undefined}
                      className="h-12"
                    />
                    {confirmPassword.length > 0 && !passwordsMatch ? (
                      <p id="confirm-password-error" className="text-xs text-red-700">
                        Пароли не совпадают.
                      </p>
                    ) : null}
                  </div>
                </div>

                {passwordMsg ? (
                  <p
                    className={`mt-4 text-sm ${passwordMsg.ok ? "text-success" : "text-red-700"}`}
                    role={passwordMsg.ok ? "status" : "alert"}
                  >
                    {passwordMsg.text}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" disabled={passwordLoading || !passwordFormValid}>
                    {passwordLoading ? "Сохраняем..." : "Сохранить пароль"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={passwordLoading}
                    onClick={closePasswordForm}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <LogOut className="mt-0.5 shrink-0 text-muted" size={20} aria-hidden="true" />
              <div>
                <h3 className="font-extrabold">Текущий сеанс</h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Вы вернётесь на страницу входа. Несохранённые изменения профиля будут потеряны.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              disabled={signOutLoading}
              onClick={() => void endSession()}
            >
              {signOutLoading ? "Выходим..." : "Выйти из аккаунта"}
            </Button>
          </div>
          <div className="p-5 sm:p-6">
            {!deleteOpen ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Trash2 className="mt-0.5 shrink-0 text-red-700" size={20} aria-hidden="true" />
                  <div>
                    <h3 className="font-extrabold">Отзыв согласия и удаление аккаунта</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">Доступ прекратится, данные профиля будут обезличены. Игровые события сохранятся без ваших контактных данных.</p>
                    <Link href={"/privacy" as Route} className="mt-2 inline-flex text-sm font-bold text-journey underline underline-offset-2">Политика обработки данных</Link>
                  </div>
                </div>
                <Button type="button" variant="danger" className="shrink-0" onClick={() => setDeleteOpen(true)}>Удалить аккаунт</Button>
              </div>
            ) : (
              <form onSubmit={deleteAccount} className="max-w-2xl" noValidate>
                <h3 className="text-lg font-extrabold">Подтвердите удаление аккаунта</h3>
                <p className="mt-1 text-sm leading-6 text-muted">Действие нельзя отменить. Введите текущий пароль для подтверждения.</p>
                <div className="mt-4 max-w-sm">
                  <label htmlFor="delete-account-password" className="mb-2 block text-sm font-extrabold">Текущий пароль</label>
                  <Input id="delete-account-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => { setDeletePassword(event.target.value); setDeleteError(null); }} minLength={8} maxLength={128} required aria-invalid={Boolean(deleteError)} aria-describedby={deleteError ? "delete-account-error" : undefined} />
                  {deleteError ? <p id="delete-account-error" className="mt-2 text-xs font-semibold text-red-700" role="alert">{deleteError}</p> : null}
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" variant="danger" disabled={deleteLoading}>{deleteLoading ? "Удаляем..." : "Удалить аккаунт и данные"}</Button>
                  <Button type="button" variant="secondary" disabled={deleteLoading} onClick={() => { setDeleteOpen(false); setDeletePassword(""); setDeleteError(null); }}>Отмена</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function GameBoardChoice({
  value,
  label,
  description,
  selected,
  onSelect
}: {
  value: "classic" | "journey";
  label: string;
  description: string;
  selected: boolean;
  onSelect: (value: "classic" | "journey") => void;
}) {
  const Icon = value === "classic" ? LayoutGrid : Map;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={[
        "overflow-hidden rounded-2xl bg-card p-2 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25",
        selected ? "ring-2 ring-journey" : "hover:bg-[#f6eadc]"
      ].join(" ")}
    >
      <span className="relative block aspect-[16/7] overflow-hidden rounded-xl bg-[#e9ddc7]" aria-hidden="true">
        {value === "classic" ? (
          <span className="absolute inset-[12%] rounded-[38%] border-[10px] border-white shadow-[0_8px_22px_rgba(27,57,118,.16)]">
            <span className="absolute left-1/2 top-1/2 h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-journey/15" />
          </span>
        ) : (
          <>
            <span className="absolute left-[9%] top-[18%] h-[65%] w-[82%] rotate-[-4deg] rounded-[42%] border-[7px] border-white shadow-[0_8px_22px_rgba(27,57,118,.16)]" />
            <span className="absolute left-[43%] top-[38%] h-8 w-12 rounded-lg bg-ink/85" />
          </>
        )}
      </span>
      <span className="flex items-center gap-3 px-2 py-3">
        <span className={[
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          selected ? "bg-journey text-white" : "bg-white text-muted"
        ].join(" ")}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-extrabold">{label}</span>
          <span className="mt-0.5 block text-xs text-muted">{description}</span>
        </span>
        {selected ? <CheckCircle2 className="ml-auto shrink-0 text-journey" size={20} aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

function SaveProfileButton({
  loading,
  disabled,
  className = ""
}: {
  loading: boolean;
  disabled: boolean;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      variant="action"
      disabled={loading || disabled}
      className={`shrink-0 ${className}`}
    >
      <Save className="mr-2" size={16} aria-hidden="true" />
      {loading ? "Сохраняем..." : "Сохранить изменения"}
    </Button>
  );
}

function ProfileStatus({
  message,
  hasChanges
}: {
  message: { ok: boolean; text: string } | null;
  hasChanges: boolean;
}) {
  if (message) {
    return (
      <p
        className={`mt-1 flex items-center gap-1.5 text-sm ${message.ok ? "text-success" : "text-red-700"}`}
        role={message.ok ? "status" : "alert"}
      >
        {message.ok ? <CheckCircle2 size={15} aria-hidden="true" /> : null}
        {message.text}
      </p>
    );
  }

  return (
    <p className={`mt-1 text-sm ${hasChanges ? "font-bold text-warning" : "text-muted"}`}>
      {hasChanges ? "Есть несохранённые изменения" : "Все изменения сохранены"}
    </p>
  );
}

async function responseMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") return fallback;

  const message = "message" in data ? data.message : null;
  if (Array.isArray(message)) return message.join(". ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

function yearsWord(value: number) {
  const lastTwoDigits = value % 100;
  const lastDigit = value % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "лет";
  if (lastDigit === 1) return "год";
  if (lastDigit >= 2 && lastDigit <= 4) return "года";
  return "лет";
}

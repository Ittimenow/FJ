"use client";

import { CheckCircle2, KeyRound, LayoutGrid, LogOut, Map, ShieldCheck, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CityCombobox, type CityOption } from "@/components/auth/city-combobox";
import { normalizeTelegramChannel, validateTelegramChannel } from "@/components/auth/auth-validation";
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
    gameRoomView: profile.user.gameRoomView,
    telegramChannel: profile.user.telegramChannel ?? "",
    telegramMentionConsent: profile.user.telegramMentionConsent,
    city: profile.user.city
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
  const [telegramChannel, setTelegramChannel] = useState(profile.user.telegramChannel ?? "");
  const [telegramMentionConsent, setTelegramMentionConsent] = useState(
    profile.user.telegramMentionConsent
  );
  const [city, setCity] = useState<CityOption | null>(profile.user.city);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileChangeVersion, setProfileChangeVersion] = useState(0);
  const immediateSaveRef = useRef(false);
  const failedSaveVersionRef = useRef<number | null>(null);

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
  const normalizedTelegramChannel = normalizeTelegramChannel(telegramChannel);
  const normalizedGameExperience = gameExperience === "" ? null : Number(gameExperience);
  const displayNameValid = normalizedDisplayName.length > 0;
  const telegramError = validateTelegramChannel(normalizedTelegramChannel);
  const cityValid = city !== null;
  const gameExperienceValid =
    normalizedGameExperience === null ||
    (Number.isInteger(normalizedGameExperience) &&
      normalizedGameExperience >= 0 &&
      normalizedGameExperience <= 100);
  const profileFormValid =
    displayNameValid && gameExperienceValid && telegramError === null && cityValid;
  const hasAvatarChanges =
    avatarPending !== undefined && avatarPending !== savedProfile.avatarUrl;
  const hasProfileChanges =
    hasAvatarChanges ||
    normalizedDisplayName !== savedProfile.displayName ||
    gender !== savedProfile.gender ||
    birthDate !== savedProfile.birthDate ||
    normalizedGameExperience !== savedProfile.gameExperience ||
    figurine !== savedProfile.figurine ||
    gameRoomView !== savedProfile.gameRoomView ||
    normalizedTelegramChannel !== savedProfile.telegramChannel ||
    telegramMentionConsent !== savedProfile.telegramMentionConsent ||
    city?.id !== savedProfile.city?.id;
  const visibleProfileMsg = profileMsg?.ok && hasProfileChanges ? null : profileMsg;
  const passwordsMatch = newPassword === confirmPassword;
  const passwordFormValid =
    currentPassword.length > 0 && newPassword.length >= 8 && passwordsMatch;

  function markProfileChanged(immediate = false) {
    if (immediate) immediateSaveRef.current = true;
    failedSaveVersionRef.current = null;
    setProfileMsg(null);
    setProfileChangeVersion((version) => version + 1);
  }

  useEffect(() => {
    if (!hasProfileChanges || profileLoading || !profileFormValid) return;
    if (failedSaveVersionRef.current === profileChangeVersion) return;

    const delay = immediateSaveRef.current ? 0 : 700;
    immediateSaveRef.current = false;
    const timeout = window.setTimeout(() => {
      void saveProfile(profileChangeVersion);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [hasProfileChanges, profileChangeVersion, profileFormValid, profileLoading]);

  async function saveProfile(changeVersion: number) {
    if (!hasProfileChanges || profileLoading) return;
    if (!profileFormValid) {
      return;
    }

    const snapshot = {
      displayName: normalizedDisplayName,
      gender,
      birthDate,
      gameExperience: normalizedGameExperience,
      avatarPending,
      figurine,
      gameRoomView,
      telegramChannel: normalizedTelegramChannel,
      telegramMentionConsent,
      city
    };
    const savedBefore = savedProfile;
    const avatarChanged =
      snapshot.avatarPending !== undefined && snapshot.avatarPending !== savedBefore.avatarUrl;

    setProfileLoading(true);
    setProfileMsg(null);

    try {
      if (avatarChanged) {
        if (snapshot.avatarPending === null) {
          const response = await fetch(`${publicApiBaseUrl()}/api/users/me/avatar`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) {
            throw new Error(await responseMessage(response, "Не удалось удалить фотографию"));
          }
        } else if (snapshot.avatarPending) {
          const response = await fetch(`${publicApiBaseUrl()}/api/users/me/avatar`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ avatarDataUrl: snapshot.avatarPending })
          });
          if (!response.ok) {
            throw new Error(await responseMessage(response, "Не удалось загрузить фотографию"));
          }
        }
      }

      const body: Record<string, unknown> = {};
      if (snapshot.displayName !== savedBefore.displayName) {
        body.displayName = snapshot.displayName;
      }
      if (snapshot.gender !== savedBefore.gender) body.gender = snapshot.gender || null;
      if (snapshot.birthDate !== savedBefore.birthDate) {
        body.birthDate = snapshot.birthDate || null;
      }
      if (snapshot.gameExperience !== savedBefore.gameExperience) {
        body.gameExperience = snapshot.gameExperience;
      }
      if (snapshot.figurine !== savedBefore.figurine) body.figurine = snapshot.figurine;
      if (snapshot.gameRoomView !== savedBefore.gameRoomView) {
        body.gameRoomView = snapshot.gameRoomView;
      }
      if (snapshot.telegramChannel !== savedBefore.telegramChannel) {
        body.telegramChannel = snapshot.telegramChannel;
      }
      if (snapshot.telegramMentionConsent !== savedBefore.telegramMentionConsent) {
        body.telegramMentionConsent = snapshot.telegramMentionConsent;
      }
      if (snapshot.city?.id !== savedBefore.city?.id && snapshot.city) {
        body.cityId = snapshot.city.id;
      }

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

      const nextAvatarUrl = avatarChanged
        ? snapshot.avatarPending ?? null
        : savedBefore.avatarUrl;
      setSavedProfile({
        displayName: snapshot.displayName,
        gender: snapshot.gender,
        birthDate: snapshot.birthDate,
        gameExperience: snapshot.gameExperience,
        avatarUrl: nextAvatarUrl,
        figurine: snapshot.figurine,
        gameRoomView: snapshot.gameRoomView,
        telegramChannel: snapshot.telegramChannel,
        telegramMentionConsent: snapshot.telegramMentionConsent,
        city: snapshot.city
      });
      setDisplayName((current) =>
        current.trim() === snapshot.displayName ? snapshot.displayName : current
      );
      setTelegramChannel((current) =>
        normalizeTelegramChannel(current) === snapshot.telegramChannel
          ? snapshot.telegramChannel
          : current
      );
      setAvatarPending((current) =>
        current === snapshot.avatarPending ? undefined : current
      );
      setProfileMsg({ ok: true, text: "Изменения сохранены" });
      failedSaveVersionRef.current = null;
      if (
        avatarChanged ||
        snapshot.figurine !== savedBefore.figurine ||
        snapshot.displayName !== savedBefore.displayName
      ) {
        router.refresh();
      }
    } catch (error) {
      failedSaveVersionRef.current = changeVersion;
      setProfileMsg({
        ok: false,
        text: error instanceof Error ? error.message : "Не удалось сохранить изменения"
      });
    } finally {
      setProfileLoading(false);
    }
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
    <div className="grid items-start gap-5 sm:gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="contents lg:order-1 lg:sticky lg:top-28 lg:grid lg:gap-4">
        <aside className="order-1 rounded-2xl bg-ink p-5 text-white shadow-panel sm:p-6">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
            Так вас увидят игроки
          </h2>

          <div className="mt-6">
            <AvatarPicker
              currentAvatarUrl={currentAvatarUrl ?? null}
              avatarColor={avatarColor}
              initials={initials}
              figurine={figurine}
              onAvatarChange={(dataUrl) => {
                setAvatarPending(dataUrl);
                if (dataUrl) setFigurine(null);
                markProfileChanged(true);
              }}
              onFigurineChange={(figurineId) => {
                setFigurine(figurineId);
                markProfileChanged(true);
              }}
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

        <section className="order-3 rounded-2xl bg-white p-4 shadow-panel" aria-label="Текущий сеанс">
          <div className="flex items-start gap-3">
            <LogOut className="mt-0.5 shrink-0 text-muted" size={20} aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-extrabold">Текущий сеанс</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Изменения профиля сохраняются автоматически.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full"
            disabled={signOutLoading}
            onClick={() => void endSession()}
          >
            {signOutLoading ? "Выходим..." : "Выйти из аккаунта"}
          </Button>
        </section>
      </div>

      <div className="order-2 grid min-w-0 gap-5 sm:gap-6">
        <form
          id="profile-form"
          className="min-w-0"
          onSubmit={(event) => event.preventDefault()}
          aria-busy={profileLoading}
        >
          <section className="min-w-0 rounded-2xl bg-white shadow-panel">
          <div className="border-b border-line/70 p-5 sm:p-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Профиль игрока</h2>
              <ProfileStatus
                message={visibleProfileMsg}
                hasChanges={hasProfileChanges}
                loading={profileLoading}
                valid={profileFormValid}
              />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <section aria-labelledby="personal-heading">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e8effe] text-journey" aria-hidden="true">
                  <UserRound size={19} />
                </span>
                <div>
                  <h3 id="personal-heading" className="text-lg font-extrabold">
                    Персональные данные
                  </h3>
                  <p className="mt-0.5 text-sm text-muted">
                    Контактные и дополнительные данные вашего игрового профиля.
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
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      markProfileChanged();
                    }}
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
                  <label htmlFor="profile-telegram" className="text-sm font-extrabold text-ink">
                    Telegram
                  </label>
                  <Input
                    id="profile-telegram"
                    value={telegramChannel}
                    onChange={(event) => {
                      setTelegramChannel(event.target.value);
                      markProfileChanged();
                    }}
                    placeholder="@username"
                    required
                    maxLength={33}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(telegramError)}
                    aria-describedby="profile-telegram-hint"
                    className="h-12"
                  />
                  <p
                    id="profile-telegram-hint"
                    className={`text-xs ${telegramError ? "text-red-700" : "text-muted"}`}
                  >
                    {telegramError ?? "Имя пользователя из 5–32 латинских букв, цифр или подчёркиваний."}
                  </p>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-card p-3 text-sm leading-5 text-ink">
                    <input
                      type="checkbox"
                      checked={telegramMentionConsent}
                      onChange={(event) => {
                        setTelegramMentionConsent(event.target.checked);
                        markProfileChanged(true);
                      }}
                      className="mt-0.5 h-4 w-4 accent-journey"
                    />
                    <span>
                      <strong className="block">Разрешить публичное упоминание</strong>
                      <span className="mt-1 block text-xs text-muted">
                        В итогах завершённой игры появится ссылка на ваш Telegram. Без согласия будет показано только игровое имя.
                      </span>
                    </span>
                  </label>
                </div>

                <CityCombobox
                  inputId="profile-city"
                  initialValue={savedProfile.city}
                  error={cityValid ? undefined : "Выберите город из списка."}
                  onChange={(value) => {
                    setCity(value);
                    markProfileChanged(true);
                  }}
                />

                <div className="space-y-2">
                  <label htmlFor="profile-gender" className="text-sm font-extrabold text-ink">
                    Пол <span className="font-normal text-muted">(необязательно)</span>
                  </label>
                  <select
                    id="profile-gender"
                    value={gender}
                    onChange={(event) => {
                      setGender(event.target.value);
                      markProfileChanged(true);
                    }}
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
                      onChange={(event) => {
                        setBirthDate(event.target.value);
                        markProfileChanged(true);
                      }}
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
                    onChange={(event) => {
                      setGameExperience(event.target.value);
                      markProfileChanged();
                    }}
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

            <section
              className="mt-7 border-t border-line/70 pt-7"
              aria-labelledby="game-board-heading"
            >
              <div className="max-w-xl">
                <h3 id="game-board-heading" className="text-lg font-extrabold">
                  Дизайн игрового поля
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Выбранный вариант будет открываться во всех ваших партиях.
                </p>
              </div>
              <div
                className="mt-4 grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Дизайн игрового поля"
              >
                <GameBoardChoice
                  value="classic"
                  label="Поле 1"
                  description="Классическое круговое поле"
                  selected={gameRoomView === "classic"}
                  onSelect={(value) => {
                    setGameRoomView(value);
                    markProfileChanged(true);
                  }}
                />
                <GameBoardChoice
                  value="journey"
                  label="Поле 2"
                  badge="Бета"
                  description="Карта финансового путешествия"
                  selected={gameRoomView === "journey"}
                  onSelect={(value) => {
                    setGameRoomView(value);
                    markProfileChanged(true);
                  }}
                />
              </div>
            </section>
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
              Управляйте паролем и удалением аккаунта отдельно от игрового профиля.
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
    </div>
  );
}

function GameBoardChoice({
  value,
  label,
  badge,
  description,
  selected,
  onSelect
}: {
  value: "classic" | "journey";
  label: string;
  badge?: string;
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
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold">{label}</span>
            {badge ? (
              <span className="rounded-md bg-[#e8effe] px-2 py-0.5 text-[10px] font-extrabold text-journey">
                {badge}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-muted">{description}</span>
        </span>
        {selected ? <CheckCircle2 className="ml-auto shrink-0 text-journey" size={20} aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

function ProfileStatus({
  message,
  hasChanges,
  loading,
  valid
}: {
  message: { ok: boolean; text: string } | null;
  hasChanges: boolean;
  loading: boolean;
  valid: boolean;
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

  if (loading) {
    return (
      <p className="mt-1 text-sm font-bold text-journey" role="status">
        Сохраняем изменения…
      </p>
    );
  }

  if (hasChanges && !valid) {
    return (
      <p className="mt-1 text-sm font-bold text-red-700" role="status">
        Исправьте отмеченные поля — после этого изменения сохранятся автоматически
      </p>
    );
  }

  return (
    <p className={`mt-1 text-sm ${hasChanges ? "font-bold text-journey" : "text-muted"}`}>
      {hasChanges ? "Изменения сохранятся автоматически" : "Все изменения сохранены"}
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

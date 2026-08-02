"use client";

import { Ban, RotateCcw, Trash2, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";
import { shortDate } from "@/lib/format";
import { userStatusLabels } from "@/lib/game-labels";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  role: "USER" | "HOST" | "ADMIN";
  status: "ACTIVE" | "BLOCKED" | "DELETED";
  createdAt: string;
  blockedAt?: string | null;
}

function UserAvatar({ user }: { user: AdminUser }) {
  const initials = (() => {
    const parts = user.displayName.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return second
      ? (first + second).toUpperCase()
      : user.displayName.slice(0, 2).toUpperCase();
  })();

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full text-xs font-extrabold text-white"
      style={{ backgroundColor: user.avatarColor ?? "#657597" }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function AdminUsersPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  async function loadUsers() {
    setLoadingUsers(true);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "Не удалось загрузить пользователей"));
      }
      setUsers((await response.json()) as AdminUser[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Не удалось загрузить пользователей"
      );
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: String(form.get("displayName") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
          role: String(form.get("role") ?? "USER")
        })
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "Не удалось создать аккаунт"));
      }

      event.currentTarget.reset();
      await loadUsers();
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "Не удалось создать аккаунт"
      );
    } finally {
      setCreating(false);
    }
  }

  async function mutateUser(id: string, action: "block" | "unblock" | "delete") {
    const user = users.find((item) => item.id === id);
    if (!user) return;

    if (action === "block") {
      const confirmed = window.confirm(
        `Заблокировать аккаунт «${user.displayName}»? Пользователь потеряет доступ к порталу.`
      );
      if (!confirmed) return;
    }
    if (action === "delete") {
      const confirmed = window.confirm(
        `Удалить аккаунт «${user.displayName}»? Это действие нельзя отменить из панели.`
      );
      if (!confirmed) return;
    }

    setPendingUserId(id);
    setError(null);
    try {
      const endpoint =
        action === "delete"
          ? `${publicApiBaseUrl()}/api/admin/users/${id}`
          : `${publicApiBaseUrl()}/api/admin/users/${id}/${action}`;
      const response = await fetch(endpoint, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "Операция не выполнена"));
      }
      await loadUsers();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Операция не выполнена"
      );
    } finally {
      setPendingUserId(null);
    }
  }

  async function updateRole(id: string, role: AdminUser["role"]) {
    setPendingUserId(id);
    setError(null);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      });
      if (!response.ok) {
        throw new Error(await responseMessage(response, "Не удалось изменить роль"));
      }
      await loadUsers();
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Не удалось изменить роль");
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-card p-4 sm:p-5" aria-labelledby="create-account-heading">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8effe] text-journey" aria-hidden="true">
            <UserPlus size={19} />
          </span>
          <div>
            <h3 id="create-account-heading" className="font-extrabold">Новый аккаунт</h3>
            <p className="mt-1 text-sm leading-6 text-muted">Пароль должен содержать не менее восьми символов.</p>
          </div>
        </div>
        <form className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_180px_auto] xl:items-end" onSubmit={createUser}>
          <label className="grid gap-2 text-sm font-extrabold">
            Имя
            <Input className="h-12" name="displayName" autoComplete="name" required />
          </label>
          <label className="grid gap-2 text-sm font-extrabold">
            Email
            <Input className="h-12" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="grid gap-2 text-sm font-extrabold">
            Временный пароль
            <Input className="h-12" name="password" type="password" minLength={8} autoComplete="new-password" required />
          </label>
          <label className="grid gap-2 text-sm font-extrabold">
            Роль
            <select name="role" className="h-12 rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-action focus:ring-4 focus:ring-action/20" defaultValue="USER">
              <option value="USER">Игрок</option>
              <option value="HOST">Ведущий</option>
              <option value="ADMIN">Администратор</option>
            </select>
          </label>
          <Button type="submit" variant="action" className="h-12" disabled={creating}>
            {creating ? "Создаём..." : "Добавить аккаунт"}
          </Button>
        </form>
      </section>

      {error ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
          {error}
        </div>
      ) : null}

      <section aria-labelledby="accounts-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 id="accounts-heading" className="text-lg font-extrabold">Все аккаунты</h3>
            <p className="mt-1 text-sm text-muted">{loadingUsers ? "Загружаем список..." : `${users.length} аккаунтов`}</p>
          </div>
          <Button type="button" variant="ghost" className="h-9 px-3 text-xs" disabled={loadingUsers} onClick={() => void loadUsers()}>
            <RotateCcw className="mr-2" size={15} aria-hidden="true" />
            Обновить
          </Button>
        </div>

        {loadingUsers ? (
          <div className="rounded-xl bg-card p-5 text-sm text-muted" role="status">Загружаем пользователей…</div>
        ) : users.length === 0 ? (
          <div className="rounded-xl bg-card p-5 text-sm text-muted">Пользователей пока нет.</div>
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {users.map((user) => (
                <article key={user.id} className="rounded-xl bg-card p-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-extrabold">{user.displayName}</div>
                      <div className="mt-0.5 truncate text-xs text-muted">{user.email}</div>
                    </div>
                    <UserStatus status={user.status} />
                  </div>
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2 text-xs font-bold text-muted">
                      Роль
                      <RoleSelect user={user} disabled={pendingUserId === user.id} onChange={updateRole} />
                    </label>
                    <div className="text-xs text-muted">Создан {shortDate(user.createdAt)}</div>
                    <UserActions user={user} pending={pendingUserId === user.id} onMutate={mutateUser} />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-line/70 md:block" role="region" aria-label="Пользователи" tabIndex={0}>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-ink text-white">
                  <tr>
                    <th className="px-4 py-3 font-extrabold">Аккаунт</th>
                    <th className="px-4 py-3 font-extrabold">Роль</th>
                    <th className="px-4 py-3 font-extrabold">Статус</th>
                    <th className="px-4 py-3 font-extrabold">Создан</th>
                    <th className="px-4 py-3 font-extrabold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-line/70 last:border-b-0 even:bg-card/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <div className="font-extrabold">{user.displayName}</div>
                            <div className="mt-0.5 text-xs text-muted">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleSelect user={user} disabled={pendingUserId === user.id} onChange={updateRole} /></td>
                      <td className="px-4 py-3"><UserStatus status={user.status} /></td>
                      <td className="px-4 py-3 text-muted">{shortDate(user.createdAt)}</td>
                      <td className="px-4 py-3"><UserActions user={user} pending={pendingUserId === user.id} onMutate={mutateUser} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function RoleSelect({
  user,
  disabled,
  onChange
}: {
  user: AdminUser;
  disabled: boolean;
  onChange: (id: string, role: AdminUser["role"]) => void;
}) {
  return (
    <select
      className="h-10 rounded-lg border border-line bg-white px-2 text-sm font-bold outline-none transition focus:border-action focus:ring-4 focus:ring-action/20"
      value={user.role}
      disabled={disabled}
      aria-label={`Роль пользователя ${user.displayName}`}
      onChange={(event) => void onChange(user.id, event.target.value as AdminUser["role"])}
    >
      <option value="USER">Игрок</option>
      <option value="HOST">Ведущий</option>
      <option value="ADMIN">Администратор</option>
    </select>
  );
}

function UserStatus({ status }: { status: AdminUser["status"] }) {
  const className =
    status === "ACTIVE"
      ? "bg-[#eaf3e0] text-success"
      : status === "BLOCKED"
        ? "bg-[#fff0df] text-warning"
        : "bg-red-100 text-red-800";
  return (
    <span className={`inline-flex shrink-0 rounded-lg px-2.5 py-1 text-xs font-extrabold ${className}`}>
      {userStatusLabels[status] ?? status}
    </span>
  );
}

function UserActions({
  user,
  pending,
  onMutate
}: {
  user: AdminUser;
  pending: boolean;
  onMutate: (id: string, action: "block" | "unblock" | "delete") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {user.status === "BLOCKED" ? (
        <Button type="button" variant="secondary" className="h-9 px-3 text-xs" disabled={pending} onClick={() => void onMutate(user.id, "unblock")}>
          <RotateCcw className="mr-1.5" size={14} aria-hidden="true" />
          Разблокировать
        </Button>
      ) : (
        <Button type="button" variant="secondary" className="h-9 px-3 text-xs" disabled={pending} onClick={() => void onMutate(user.id, "block")}>
          <Ban className="mr-1.5" size={14} aria-hidden="true" />
          Заблокировать
        </Button>
      )}
      <Button type="button" variant="danger" className="h-9 px-3 text-xs" disabled={pending} onClick={() => void onMutate(user.id, "delete")}>
        <Trash2 className="mr-1.5" size={14} aria-hidden="true" />
        Удалить
      </Button>
    </div>
  );
}

async function responseMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") return fallback;
  const message = "message" in data ? data.message : null;
  if (Array.isArray(message)) return message.join(". ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

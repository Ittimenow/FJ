"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicApiBaseUrl } from "@/lib/api";

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
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return b ? (a + b).toUpperCase() : user.displayName.slice(0, 2).toUpperCase();
  })();

  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="h-8 w-8 rounded-full object-cover border border-line shrink-0"
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white select-none"
      style={{ backgroundColor: user.avatarColor ?? "#64748b" }}
    >
      {initials}
    </div>
  );
}

export function AdminUsersPanel({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    const response = await fetch(`${publicApiBaseUrl()}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      setError("Не удалось загрузить пользователей");
      return;
    }
    setUsers((await response.json()) as AdminUser[]);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`${publicApiBaseUrl()}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        displayName: String(form.get("displayName") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        role: String(form.get("role") ?? "USER")
      })
    });
    setLoading(false);

    if (!response.ok) {
      setError("Не удалось создать аккаунт");
      return;
    }

    event.currentTarget.reset();
    await loadUsers();
  }

  async function mutateUser(id: string, action: "block" | "unblock" | "delete") {
    setError(null);
    const method = action === "delete" ? "DELETE" : "PATCH";
    const response = await fetch(`${publicApiBaseUrl()}/api/admin/users/${id}/${action === "delete" ? "" : action}`, {
      method,
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      setError("Операция не выполнена");
      return;
    }
    await loadUsers();
  }

  async function updateRole(id: string, role: AdminUser["role"]) {
    setError(null);
    const response = await fetch(`${publicApiBaseUrl()}/api/admin/users/${id}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });

    if (!response.ok) {
      setError("Не удалось изменить роль");
      return;
    }
    await loadUsers();
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_130px_auto]" onSubmit={createUser}>
        <Input name="displayName" placeholder="Имя" required />
        <Input name="email" type="email" placeholder="email@example.com" required />
        <Input name="password" type="password" placeholder="Пароль" minLength={8} required />
        <select name="role" className="h-10 rounded-md border border-line bg-white px-3 text-sm" defaultValue="USER">
          <option value="USER">Пользователь</option>
          <option value="HOST">Ведущий</option>
          <option value="ADMIN">Админ</option>
        </select>
        <Button type="submit" disabled={loading}>
          Добавить
        </Button>
      </form>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-line text-neutral-500">
            <tr>
              <th className="w-10 py-2" />
              <th className="py-2 font-medium">Аккаунт</th>
              <th className="py-2 font-medium">Роль</th>
              <th className="py-2 font-medium">Статус</th>
              <th className="py-2 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-line">
                <td className="py-3 pr-2">
                  <UserAvatar user={user} />
                </td>
                <td className="py-3">
                  <div className="font-medium">{user.displayName}</div>
                  <div className="text-xs text-neutral-500">{user.email}</div>
                </td>
                <td className="py-3">
                  <select
                    className="h-9 rounded-md border border-line bg-white px-2 text-sm"
                    value={user.role}
                    onChange={(event) =>
                      updateRole(user.id, event.target.value as AdminUser["role"])
                    }
                  >
                    <option value="USER">USER</option>
                    <option value="HOST">HOST</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="py-3">{user.status}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    {user.status === "BLOCKED" ? (
                      <Button variant="secondary" className="h-8" onClick={() => mutateUser(user.id, "unblock")}>
                        Разблок.
                      </Button>
                    ) : (
                      <Button variant="secondary" className="h-8" onClick={() => mutateUser(user.id, "block")}>
                        Блок
                      </Button>
                    )}
                    <Button variant="danger" className="h-8" onClick={() => mutateUser(user.id, "delete")}>
                      Удалить
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

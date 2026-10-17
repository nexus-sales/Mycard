"use client";

import { useMemo, useTransition, useState } from "react";
import {
  toggleUserActiveAction,
  generatePasswordResetAction,
} from "@/lib/actions/admin";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  active: boolean;
  createdAt: Date;
}

export default function UserTable({ users }: { users: User[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const filteredUsers = useMemo(
    () => users.filter((user) =>
      !normalizedQuery || [user.name, user.email, user.role].some((value) =>
        value.toLocaleLowerCase("es").includes(normalizedQuery)
      )
    ),
    [normalizedQuery, users]
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <label htmlFor="user-search" className="sr-only">Buscar usuarios</label>
        <input
          id="user-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, email o rol…"
          className="min-h-11 w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
        <p className="mt-2 text-xs text-slate-500" aria-live="polite">{filteredUsers.length} de {users.length} usuarios</p>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[52rem] text-sm">
        <caption className="sr-only">Usuarios con acceso a MyCard</caption>
        <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th scope="col" className="text-left px-5 py-3">Nombre</th>
            <th scope="col" className="text-left px-5 py-3">Email</th>
            <th scope="col" className="text-left px-5 py-3">Rol</th>
            <th scope="col" className="text-left px-5 py-3">Estado</th>
            <th scope="col" className="text-left px-5 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {filteredUsers.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
          {filteredUsers.length === 0 && (
            <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">No hay usuarios que coincidan con la búsqueda.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggleActive = () => {
    startTransition(async () => {
      const result = await toggleUserActiveAction(user.id, !user.active);
      if ("error" in result && result.error) setFeedback(result.error);
    });
  };

  const generateReset = () => {
    startTransition(async () => {
      const result = await generatePasswordResetAction(user.id);
      if ("resetUrl" in result && result.resetUrl) setResetUrl(result.resetUrl);
      if ("error" in result && result.error) setFeedback(result.error);
    });
  };

  const copyResetUrl = async () => {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setFeedback("Enlace copiado");
    } catch {
      setFeedback("No se pudo copiar el enlace");
    }
  };

  return (
    <tr className={!user.active ? "opacity-50" : ""}>
      <td className="px-5 py-4 font-medium text-white">
        {user.name}
      </td>
      <td className="px-5 py-4 text-slate-400">
        {user.email}
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            user.role === "ADMIN"
              ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
              : "bg-slate-800 text-slate-400 border border-slate-700"
          }`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            user.active
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
          }`}
        >
          {user.active ? "Activo" : "Desactivado"}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {user.role !== "ADMIN" && (
            <button
              onClick={toggleActive}
              disabled={isPending}
              className="min-h-9 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {user.active ? "Desactivar" : "Activar"}
            </button>
          )}
          <button
            onClick={generateReset}
            disabled={isPending}
            className="min-h-9 rounded-lg border border-indigo-500/30 px-3 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10 disabled:opacity-50"
          >
            Resetear contraseña
          </button>
        </div>
        {resetUrl && (
          <div className="mt-2 max-w-md break-all rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-2 text-xs">
            <span className="font-medium text-indigo-300">Enlace: </span>
            <code className="text-indigo-200">{resetUrl}</code>
            <button type="button" onClick={copyResetUrl} className="mt-2 block min-h-9 rounded-lg bg-indigo-600 px-3 font-bold text-white hover:bg-indigo-500">Copiar enlace</button>
          </div>
        )}
        {feedback && <p role="status" className="mt-2 text-xs text-slate-400">{feedback}</p>}
      </td>
    </tr>
  );
}

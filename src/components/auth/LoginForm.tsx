"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

type State = { error?: string } | undefined;

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    loginAction,
    undefined
  );

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8"
    >
      {state?.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

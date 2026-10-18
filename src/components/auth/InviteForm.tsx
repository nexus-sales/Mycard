"use client";

import { useActionState } from "react";
import { registerWithInviteAction } from "@/lib/actions/invite";
import { useI18n } from "@/lib/i18n/client";

type FieldErrors = Partial<Record<string, string[]>>;
type State =
  | { error?: string; fieldErrors?: FieldErrors; inviteUrl?: never }
  | undefined;

interface Props {
  inviteToken: string;
  prefilledEmail?: string;
}

export default function InviteForm({ inviteToken, prefilledEmail }: Props) {
  const { t } = useI18n();
  const action = async (_prev: State, formData: FormData) =>
    registerWithInviteAction(inviteToken, formData);

  const [state, formAction, isPending] = useActionState<State, FormData>(
    action,
    undefined
  );

  const fe = state?.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl border border-ink/15 bg-paper-2/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8"
    >
      {state?.error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
        >
          {state.error}
        </div>
      )}

      {/* Email (solo si no viene prefijado desde la invitación) */}
      {!prefilledEmail && (
        <Field
          id="email"
          name="email"
          label={t.auth.email}
          type="email"
          autoComplete="email"
          required
          error={fe.email?.[0]}
        />
      )}

      <Field
        id="name"
        name="name"
        label={t.invite.fullName}
        autoComplete="name"
        required
        error={fe.name?.[0]}
      />

      <Field
        id="slug"
        name="slug"
        label={t.invite.slug}
        placeholder={t.invite.slugPlaceholder}
        hint={t.invite.slugHint}
        required
        error={fe.slug?.[0]}
      />

      <Field
        id="password"
        name="password"
        label={t.auth.password}
        type="password"
        autoComplete="new-password"
        hint={t.invite.passwordHint}
        required
        error={fe.password?.[0]}
      />

      <Field
        id="confirmPassword"
        name="confirmPassword"
        label={t.invite.confirmPassword}
        type="password"
        autoComplete="new-password"
        required
        error={fe.confirmPassword?.[0]}
      />

      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-xl bg-voltio px-4 text-sm font-bold text-basalto shadow-lg shadow-basalto/20 transition-colors hover:bg-voltio/90 disabled:opacity-60"
      >
        {isPending ? t.invite.submitting : t.invite.submit}
      </button>
    </form>
  );
}

// ─── Small reusable field ───────────────────
interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  name: string;
  label: string;
  hint?: string;
  error?: string;
}

function Field({ id, label, hint, error, ...inputProps }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-ink-2"
      >
        {label}
      </label>
      <input
        id={id}
        className={`min-h-11 w-full rounded-xl border bg-paper/70 px-3 text-sm text-ink outline-none transition focus:ring-2 focus:ring-sea/30 ${
          error
            ? "border-rose-500 focus:border-rose-500"
            : "border-ink/15 focus:border-sea"
        }`}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        aria-invalid={!!error}
        {...inputProps}
      />
      {(error || hint) && (
        <p
          id={`${id}-hint`}
          className={`mt-1.5 text-xs ${error ? "text-rose-700 dark:text-rose-300" : "text-ink-3"}`}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

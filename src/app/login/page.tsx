import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.login };
}

export default async function LoginPage() {
  const { t } = await getI18n();
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper px-4 py-10 text-ink flex items-center justify-center">
      <div className="absolute right-4 top-4 z-10"><LanguageSwitcher /></div>
      <div aria-hidden="true" className="absolute left-1/2 top-[-16rem] h-[32rem] w-[44rem] -translate-x-1/2 rounded-full bg-sea/20 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-2.5 font-bold text-ink">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-voltio text-sm font-black text-basalto">MC</span>
          MyCard
        </Link>
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-ink">{t.auth.loginTitle}</h1>
          <p className="mt-2 text-sm text-ink-2">{t.auth.loginSubtitle}</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs leading-5 text-ink-3">
          {t.auth.inviteOnly}
        </p>
      </div>
    </main>
  );
}

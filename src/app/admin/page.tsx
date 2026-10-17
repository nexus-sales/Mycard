import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import AdminInviteForm from "@/components/admin/AdminInviteForm";
import UserTable from "@/components/admin/UserTable";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    }),
    prisma.invite.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, expiresAt: true, createdAt: true },
    }),
  ]);

  const activeUsers = users.filter((user) => user.active).length;
  const admins = users.filter((user) => user.role === "ADMIN").length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/15 text-sm text-indigo-300">MC</span>
            <span className="hidden sm:inline">MyCard</span>
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 md:inline">{admin.email}</span>
            <Link href="/dashboard" className="inline-flex min-h-10 items-center rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-500/50 hover:text-white">
              Mi tarjeta
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">Administración</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Control de accesos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Gestiona las invitaciones privadas, el estado de las cuentas y los enlaces de recuperación.</p>
        </div>

        <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Usuarios", value: users.length, color: "text-white" },
            { label: "Activos", value: activeUsers, color: "text-emerald-300" },
            { label: "Invitaciones", value: invites.length, color: "text-indigo-300" },
            { label: "Administradores", value: admins, color: "text-violet-300" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
              <strong className={`block text-2xl font-black ${metric.color}`}>{metric.value}</strong>
              <span className="mt-1 block text-xs font-medium text-slate-500">{metric.label}</span>
            </div>
          ))}
        </section>

        <section aria-labelledby="create-invite-title">
          <div className="mb-4">
            <h2 id="create-invite-title" className="text-lg font-bold text-white">Crear invitación</h2>
            <p className="mt-1 text-sm text-slate-500">Genera un enlace temporal para una nueva cuenta.</p>
          </div>
          <AdminInviteForm />
        </section>

        <section aria-labelledby="pending-invites-title">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 id="pending-invites-title" className="text-lg font-bold text-white">Invitaciones pendientes</h2>
              <p className="mt-1 text-sm text-slate-500">Enlaces todavía válidos y sin utilizar.</p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">{invites.length}</span>
          </div>
          {invites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-10 text-center text-sm text-slate-500">No hay invitaciones pendientes.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
              <table className="w-full min-w-[34rem] text-sm">
                <caption className="sr-only">Invitaciones pendientes de utilizar</caption>
                <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500">
                  <tr><th scope="col" className="px-5 py-3 text-left">Destinatario</th><th scope="col" className="px-5 py-3 text-left">Creada</th><th scope="col" className="px-5 py-3 text-left">Caduca</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invites.map((invite) => (
                    <tr key={invite.id}>
                      <td className="px-5 py-4 font-medium text-slate-200">{invite.email ?? <span className="italic text-slate-500">Invitación abierta</span>}</td>
                      <td className="px-5 py-4 text-slate-500">{invite.createdAt.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-5 py-4 text-slate-400">{invite.expiresAt.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="users-title">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 id="users-title" className="text-lg font-bold text-white">Usuarios</h2><p className="mt-1 text-sm text-slate-500">Cuentas con acceso a MyCard.</p></div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">{users.length}</span>
          </div>
          <UserTable users={users} />
        </section>
      </div>
    </main>
  );
}

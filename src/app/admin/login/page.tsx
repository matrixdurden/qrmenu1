import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/admin/auth-actions";
import { getCurrentAdmin, hasAdminUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await hasAdminUsers())) redirect("/admin/setup");
  if (await getCurrentAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-mark">QR</div>
        <span className="eyebrow">QR MENU STUDIO</span>
        <h1>Admin girişi</h1>
        <p>Menülerinizi ve sitelerinizi yönetmek için giriş yapın.</p>
        {error === "locked" ? <div className="form-error">Çok fazla başarısız deneme. Giriş 15 dakika kilitlendi.</div> : error ? <div className="form-error">E-posta veya şifre hatalı.</div> : null}
        <form action={loginAdmin} className="stack-form auth-form">
          <label>E-posta<input type="email" name="email" autoComplete="email" required /></label>
          <label>Şifre<input type="password" name="password" autoComplete="current-password" minLength={10} required /></label>
          <button className="button primary" type="submit">Giriş yap</button>
        </form>
        <Link className="auth-public-link" href="/menu/mira">Demo menüyü aç →</Link>
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";
import { setupAdmin } from "@/app/admin/auth-actions";
import { hasAdminUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await hasAdminUsers()) redirect("/admin/login");
  const { error } = await searchParams;
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-mark">QR</div>
        <span className="eyebrow">İLK KURULUM</span>
        <h1>Admin hesabını oluştur</h1>
        <p>Bu ekran yalnızca ilk yönetici oluşturulana kadar açıktır. En az 10 karakterli güçlü bir şifre kullanın.</p>
        {error ? <div className="form-error">Bilgileri kontrol edin; şifreler aynı olmalı.</div> : null}
        <form action={setupAdmin} className="stack-form auth-form">
          <label>E-posta<input type="email" name="email" autoComplete="email" required /></label>
          <label>Şifre<input type="password" name="password" autoComplete="new-password" minLength={10} required /></label>
          <label>Şifre tekrar<input type="password" name="confirmPassword" autoComplete="new-password" minLength={10} required /></label>
          <button className="button primary" type="submit">Admin hesabını oluştur</button>
        </form>
      </section>
    </main>
  );
}

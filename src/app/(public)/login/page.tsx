import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
        Sign in
      </h1>
      <p className="mt-4 text-[var(--color-ink-muted)]">
        We&apos;ll email you a magic link. No password required.
      </p>
      <LoginForm />
    </section>
  );
}

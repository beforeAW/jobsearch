import { AUTH_COOKIE_NAME, isValidSessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (isValidSessionToken(token)) {
    redirect("/");
  }

  const params = await searchParams;
  const hasError = params.error === "invalid";

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="login-eyebrow">jsearch</p>
        <h1>Privat jobböversikt</h1>
        <p className="login-copy">
          Logga in med ditt personliga lösenord för att komma till din
          jobbsökningsvy för Arbetsförmedlingen.
        </p>

        {hasError ? (
          <p className="login-error">Fel lösenord. Försök igen.</p>
        ) : null}

        <form method="POST" action="/api/auth/login" className="login-form">
          <label htmlFor="password">Lösenord</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
          <button type="submit">Logga in</button>
        </form>
      </section>
    </main>
  );
}

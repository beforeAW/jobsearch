export const AUTH_COOKIE_NAME = "jsearch_session";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getExpectedSessionToken(): string {
  return getRequiredEnv("APP_SESSION_SECRET");
}

export function isValidSessionToken(token: string | undefined): boolean {
  try {
    return Boolean(token) && token === getExpectedSessionToken();
  } catch {
    return false;
  }
}

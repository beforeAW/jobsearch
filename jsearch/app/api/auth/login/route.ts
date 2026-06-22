import { AUTH_COOKIE_NAME, getExpectedSessionToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string") {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }

  const expectedPassword = process.env.APP_LOGIN_PASSWORD;

  if (!expectedPassword || password !== expectedPassword) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }

  const response = NextResponse.redirect(new URL("/", request.url));

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: getExpectedSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

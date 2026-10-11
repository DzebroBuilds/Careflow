"use server";
import { redirect } from "next/navigation";
import { landingPage } from "./permissions";
import { createSession, deleteSession } from "./session";
import { checkLogin } from "./users";

export interface LoginState { error?: string }

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const user = checkLogin(email, password);
  if (!user) return { error: "That email and password don't match." };
  await createSession(user.id);
  redirect(landingPage(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function Login() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="rise w-full max-w-[400px]">
        <div className="mb-6 flex items-center gap-2.5 text-[17px] font-semibold tracking-wide">
          <span className="grid size-8 place-items-center rounded-md bg-accent font-mono text-[15px] text-accent-fg">C</span>
          Careflow
        </div>
        <h1 className="mb-1">Sign in</h1>
        <p className="mb-5 text-fg-2">Compliance readiness for your group homes.</p>
        <LoginForm />
      </div>
    </div>
  );
}

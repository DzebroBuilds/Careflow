"use client";
import { useActionState, useRef } from "react";
import { login, type LoginState } from "@/lib/auth/actions";

const DEMO = [
  { label: "Agency", sub: "All clients, control center", email: "agency@careflow.demo" },
  { label: "Owner", sub: "All four homes", email: "owner@nwsl.demo" },
  { label: "House manager", sub: "Alder House only", email: "manager.alder@nwsl.demo" },
  { label: "Direct support", sub: "Birch Lane floor work only", email: "dsp.birch@nwsl.demo" },
  { label: "Auditor", sub: "Read-only, all homes", email: "auditor@nwsl.demo" },
] as const;

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const email = useRef<HTMLInputElement>(null);
  const pass = useRef<HTMLInputElement>(null);

  return (
    <>
      <form action={action} className="rounded-lg border border-line bg-surface p-5">
        <label htmlFor="email" className="mb-1 block text-[13px] font-medium">Email</label>
        <input ref={email} id="email" name="email" type="email" autoComplete="username" required
          className="mb-3 h-10 w-full rounded-md border border-line-strong bg-surface px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
        <label htmlFor="password" className="mb-1 block text-[13px] font-medium">Password</label>
        <input ref={pass} id="password" name="password" type="password" autoComplete="current-password" required
          className="mb-4 h-10 w-full rounded-md border border-line-strong bg-surface px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30" />
        {state.error && <p role="alert" className="mb-3 rounded-md bg-bad-soft px-3 py-2 text-[13px] text-bad">{state.error}</p>}
        <button disabled={pending} className="press h-10 w-full rounded-md bg-accent font-medium text-accent-fg disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <section className="mt-5">
        <h2 className="mb-2 text-[13px] text-fg-2">Demo accounts. Click one to fill, password <span className="font-mono">careflow-demo</span></h2>
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          {DEMO.map((d) => (
            <li key={d.email} className="border-b border-line last:border-0">
              <button type="button" className="press hov flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-2"
                onClick={() => { if (email.current && pass.current) { email.current.value = d.email; pass.current.value = "careflow-demo"; pass.current.focus(); } }}>
                <span className="font-medium">{d.label}</span>
                <span className="text-[13px] text-fg-3">{d.sub}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-fg-3">Demo data only. No real residents or staff.</p>
      </section>
    </>
  );
}

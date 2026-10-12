import Link from "next/link";

const highlights = [
  ["01", "Keep every record connected", "Link residents, staff credentials, medications, incidents, and documents in one calm, searchable workspace."],
  ["02", "See what needs attention", "A focused dashboard brings expiring credentials, follow-ups, and missing documentation forward before an inspection does."],
  ["03", "Prepare with confidence", "Organize the evidence your team needs for day-to-day oversight and inspection preparation without chasing paper files."],
];

const dashboardItems = [
  ["Medication review", "4 residents due this week", "This week"],
  ["Staff orientation", "Jordan Lee's pre-service file needs review", "This week"],
  ["Incident follow-up", "Document outcome and required notifications", "Action needed"],
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f7f4] text-[#16221d]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-3" aria-label="CareFlow home">
            <span className="grid size-10 place-items-center rounded-xl bg-[#235a45] text-lg font-bold text-white shadow-sm">C</span>
            <span className="text-lg font-semibold tracking-tight">CareFlow</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#4e5c55] md:flex" aria-label="Main navigation">
            <a href="#how-it-works" className="transition hover:text-[#235a45]">How it works</a>
            <a href="#workspace" className="transition hover:text-[#235a45]">Workspace</a>
            <a href="#early-access" className="transition hover:text-[#235a45]">Get started</a>
          </nav>
          <Link href="/demo" className="rounded-full border border-[#d5ddd7] bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:border-[#235a45] hover:text-[#235a45]">Try the workspace</Link>
        </header>

        <section className="grid gap-14 pb-20 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-24">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex rounded-full border border-[#c8d9cd] bg-[#e7f0e8] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#235a45]">Built for Oregon RTHs</p>
            <h1 className="text-5xl font-semibold tracking-[-0.055em] text-[#132019] sm:text-6xl lg:text-7xl">Inspection-ready care starts with a clearer day.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#536158]">CareFlow gives Residential Treatment Home owners and administrators one organized place to stay ahead of resident records, staff training, medications, incidents, emergency evidence, and required documents.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#early-access" className="rounded-full bg-[#235a45] px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-[#235a45]/20 transition hover:bg-[#174532]">Request early access</a>
              <Link href="/demo" className="rounded-full border border-[#ccd5ce] bg-white px-6 py-3.5 text-center text-sm font-semibold transition hover:border-[#235a45] hover:text-[#235a45]">Explore the dashboard</Link>
            </div>
            <p className="mt-5 text-sm text-[#718076]">A practical workspace for daily readiness — not legal or regulatory advice.</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 -z-10 rounded-full bg-[#dcecdf] blur-3xl" />
            <div className="rounded-[2rem] border border-[#d7e0d8] bg-white p-4 shadow-2xl shadow-[#163e2c]/10 sm:p-6">
              <div className="rounded-[1.3rem] bg-[#f5f8f5] p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c7c71]">Monday, October 12</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Good morning, Maya</h2></div>
                  <span className="rounded-full bg-[#dceee2] px-3 py-1.5 text-xs font-bold text-[#235a45]">Ready to review</span>
                </div>
                <div className="mt-7 grid grid-cols-3 gap-3"><Metric label="Open items" value="7" accent="bg-[#f6e6bc]" /><Metric label="Staff current" value="94%" accent="bg-[#d9eddf]" /><Metric label="Incidents" value="1" accent="bg-[#ece5f4]" /></div>
                <div className="mt-6 rounded-2xl border border-[#e0e8e1] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Needs your attention</h3><span className="text-xs font-semibold text-[#235a45]">View all</span></div>
                  <div className="space-y-3">{dashboardItems.map(([title, detail, status]) => <div key={title} className="flex items-center gap-3 rounded-xl bg-[#f7f9f7] p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e6f0e8] text-sm font-bold text-[#235a45]">✓</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="truncate text-xs text-[#718076]">{detail}</p></div><span className="text-right text-[11px] font-bold text-[#896618]">{status}</span></div>)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[#dbe2dc] py-20 sm:py-24">
          <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#235a45]">Less scramble. More clarity.</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">A home base for the details that matter.</h2></div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">{highlights.map(([number, title, description]) => <article key={number} className="rounded-2xl border border-[#dbe3dc] bg-white p-6"><p className="text-sm font-bold text-[#6e8776]">{number}</p><h3 className="mt-8 text-xl font-semibold tracking-tight">{title}</h3><p className="mt-3 leading-7 text-[#5e6d63]">{description}</p></article>)}</div>
        </section>

        <section id="workspace" className="grid gap-10 py-20 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-28">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#235a45]">One workspace</p><h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Your operation, at a glance.</h2><p className="mt-5 leading-7 text-[#5e6d63]">Start with the core records your team touches most. Each area will connect to a complete, permission-aware resident and home record.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">{[["Residents", "Profiles, plans, contacts, and key dates"], ["Staff", "Licenses, trainings, and renewals"], ["Medications", "Reviews, logs, and follow-up reminders"], ["Incidents", "Documented reports and resolutions"], ["Documents", "Policies, forms, and inspection evidence"], ["Readiness", "A focused view of what needs attention"]].map(([title, copy]) => <div key={title} className="rounded-2xl bg-[#e9f1ea] p-5 transition hover:-translate-y-0.5 hover:bg-[#dfece1]"><p className="text-lg font-semibold">{title}</p><p className="mt-2 text-sm leading-6 text-[#5b6c60]">{copy}</p></div>)}</div>
        </section>

        <section id="early-access" className="pb-20 lg:pb-28"><div className="rounded-[2rem] bg-[#173f2e] px-7 py-12 text-white sm:px-12 sm:py-16"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b7d4be]">Early access</p><div className="mt-4 flex flex-col justify-between gap-8 md:flex-row md:items-end"><div className="max-w-2xl"><h2 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Build an easier way to stay ready.</h2><p className="mt-4 leading-7 text-[#c9dacd]">Join the first group of Oregon operators shaping a calmer, more organized approach to compliance work.</p></div><a href="/setup" className="shrink-0 rounded-full bg-white px-6 py-3.5 text-center text-sm font-bold text-[#173f2e] transition hover:bg-[#e8f2e9]">Get started</a></div></div></section>
        <footer className="flex flex-col gap-3 border-t border-[#dbe2dc] py-8 text-sm text-[#6c7a70] sm:flex-row sm:items-center sm:justify-between"><p>© 2026 CareFlow.</p><p>Built to support readiness, not replace professional guidance.</p></footer>
      </div>
    </main>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <div className="rounded-xl border border-[#e1e8e2] bg-white p-3"><span className={`mb-4 block size-2 rounded-full ${accent}`} /><p className="text-xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-[11px] font-medium text-[#6b7b70]">{label}</p></div>;
}

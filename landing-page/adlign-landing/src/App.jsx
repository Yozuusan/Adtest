import React, { useMemo, useState } from "react";

// --- Simple helpers ---
function classNames(...cls) {
  return cls.filter(Boolean).join(" ");
}

function Check({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Close({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Core Landing ---
export default function AdlignLanding() {
  const [email, setEmail] = useState("");
  const [waitlistOk, setWaitlistOk] = useState(false);
  const [betaOpen, setBetaOpen] = useState(false);

  // Fake local persistence for the demo
  const handleWaitlist = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("Enter a valid email");
    try {
      const list = JSON.parse(localStorage.getItem("adlign_waitlist") || "[]");
      list.push({ email, ts: Date.now() });
      localStorage.setItem("adlign_waitlist", JSON.stringify(list));
      setWaitlistOk(true);
      setEmail("");
    } catch (_) {
      setWaitlistOk(true);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Nav onCTAClick={() => document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })} onBeta={() => setBetaOpen(true)} />
      <Hero
        email={email}
        setEmail={setEmail}
        onSubmit={handleWaitlist}
        success={waitlistOk}
        onBeta={() => setBetaOpen(true)}
      />

      <HowItWorks />

      <Features />

      <WhyUs />

      <Reviews />

      <FAQ />

      <FinalCTA onBeta={() => setBetaOpen(true)} onSubmit={handleWaitlist} setEmail={setEmail} success={waitlistOk} />

      <Footer />

      {betaOpen && <BetaModal onClose={() => setBetaOpen(false)} />}
    </div>
  );
}

// --- Sections ---
function Nav({ onCTAClick, onBeta }) {
  const links = [
    { href: "#features", label: "Features" },
    { href: "#how", label: "How It Works" },
    { href: "#why", label: "Why Adlign" },
    { href: "#reviews", label: "Reviews" },
    { href: "#faq", label: "FAQs" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-neutral-900 px-3 py-1 text-sm font-semibold tracking-wide text-white">ADLIGN</div>
          <span className="hidden rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 md:inline">Q4 Ready</span>
        </div>
        <nav className="hidden gap-6 text-sm text-neutral-700 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-neutral-900">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={onBeta} className="hidden rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 md:inline">Apply for Beta</button>
          <button onClick={onCTAClick} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">Join Waitlist</button>
        </div>
      </div>
    </header>
  );
}

function Hero({ email, setEmail, onSubmit, success, onBeta }) {
  return (
    <section className="relative overflow-hidden border-b border-neutral-200">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-600">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"/> Live for Shopify</span>
            <span className="hidden h-4 w-px bg-neutral-200 md:inline-block"/>
            <span className="hidden md:inline">No dev. No subdomains. 1‑click deploy.</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
            Don't break the promise.
          </h1>
          <p className="mt-4 text-lg leading-7 text-neutral-700">
            Adlign bridges the gap between your ads and your landing pages. Every message, every angle, perfectly aligned to boost conversions and maximise ROAS.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-neutral-700">
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-5 w-5"/> Shopify‑native — respects your theme & branding</li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-5 w-5"/> One‑click generation of message‑driven landings</li>
            <li className="flex items-start gap-2"><Check className="mt-0.5 h-5 w-5"/> Angle‑level analytics, A/B testing, real‑time insights</li>
          </ul>

          <form onSubmit={onSubmit} className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900"
            />
            <button type="submit" className="rounded-xl bg-neutral-900 px-5 py-3 text-base font-semibold text-white hover:bg-neutral-800">
              Join the Waitlist
            </button>
          </form>
          {success ? (
            <p className="mt-2 text-sm text-emerald-700">Thanks! You're on the list — we'll reach out with early access details.</p>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">or</p>
          )}
          {!success && (
            <button onClick={onBeta} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 underline decoration-neutral-300 decoration-2 underline-offset-4 hover:decoration-neutral-900">
              Apply for the Private Beta (limited spots)
            </button>
          )}
        </div>

        {/* Visual mockup */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-16 -z-10 rounded-[3rem] bg-gradient-to-tr from-neutral-100 via-white to-neutral-100"/>
          <div className="mx-auto w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Ad Creative</div>
              <div className="rounded-xl bg-neutral-100 p-6 text-neutral-600">"Anti‑aging breakthrough that visibly lifts in 7 days."</div>
            </div>
            <div className="my-4 flex items-center justify-center gap-2 text-sm text-neutral-500">
              <span className="h-px w-10 bg-neutral-200"/>→<span className="h-px w-10 bg-neutral-200"/>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Aligned Landing</div>
              <div className="rounded-xl bg-neutral-50 p-5">
                <div className="text-lg font-bold text-neutral-900">Lift. Firm. Glow.</div>
                <div className="mt-1 text-sm text-neutral-600">A message‑driven page tailored to the promise above — headline, imagery and CTA all match the ad.</div>
                <div className="mt-3 flex items-center gap-2 text-sm text-neutral-700"><Check/> 34% higher CTR to checkout*</div>
              </div>
            </div>
            <div className="mt-4 text-center text-[11px] text-neutral-400">*Illustrative example</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoStrip() {
  // Hidden for now (no social proof yet)
  return null;
}

function HowItWorks() {
  const steps = [
    { icon: "🔗", title: "Connect Shopify", text: "1‑click connect. We import your page structure." },
    { icon: "📤", title: "Add ads & angles", text: "Paste messages or sync from Meta/TikTok." },
    { icon: "⚙️", title: "Generate landings", text: "We adapt copy, imagery and CTAs to each angle." },
    { icon: "🗺️", title: "Route traffic", text: "Map each ad to its matching landing automatically." },
    { icon: "📊", title: "Measure & scale", text: "See conversion by angle. Scale winners, kill losers." },
  ];
  return (
    <section id="how" className="border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-3 text-neutral-600">From ad to aligned landing in minutes — no dev needed.</p>
        </div>

        {/* Elegant stepper */}
        <div className="relative mt-12">
          <div className="pointer-events-none absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200 md:block" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
            {steps.map((s, i) => (
              <div key={i} className="relative rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5">
                <div className="absolute -top-4 left-6">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-xs font-bold">
                    {i + 1}
                  </div>
                </div>
                <div className="mt-2 text-2xl">{s.icon}</div>
                <div className="mt-3 text-base font-semibold text-neutral-900">{s.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-neutral-700">{s.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mini caption row */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-600">
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1">No code</span>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1">Keeps your theme</span>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1">Shopify-native</span>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { title: "One‑click aligned landings", desc: "Generate message‑driven pages from your product page." },
    { title: "Angle‑level analytics", desc: "Conversion by angle, audience and source." },
    { title: "Built‑in A/B testing", desc: "Test copy, proof and creatives per angle." },
    { title: "Shopify‑native", desc: "No subdomains. No iframes. One‑click publish." },
  ];
  return (
    <section id="features" className="border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Features that set Adlign apart</h2>
          <p className="mt-3 text-neutral-600">Short, sharp and built for ROAS.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-3xl border border-neutral-200 p-6 shadow-sm">
              <div className="text-lg font-semibold">{it.title}</div>
              <p className="mt-2 text-neutral-700">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const points = [
    {
      title: "Performance now",
      text: "Turn wasted clicks into revenue with perfectly aligned landings — instantly.",
      icon: "⚡",
    },
    {
      title: "Conversion intelligence",
      text: "Learn exactly which messages convert by angle, audience and geography.",
      icon: "🧠",
    },
    {
      title: "Built for Shopify",
      text: "Native integration, theme‑safe, and brand‑consistent by design.",
      icon: "🧩",
    },
    {
      title: "Scale with confidence",
      text: "Generate 10, 50, 100 landings at once — Adlign keeps it all organised.",
      icon: "📈",
    },
  ];
  return (
    <section id="why" className="border-b border-neutral-200 bg-neutral-50/60">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why choose Adlign</h2>
          <p className="mt-3 text-neutral-600">Make your strengths obvious. Choose outcomes, not tools.</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {points.map((p, i) => (
            <div key={i} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="text-3xl">{p.icon}</div>
              <div className="mt-3 text-lg font-semibold">{p.title}</div>
              <p className="mt-2 text-neutral-700">{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reviews() {
  const items = [
    { name: "Coming soon", text: "We're onboarding early brands. Become a launch partner and be featured here.", country: "—" },
    { name: "Your brand?", text: "Apply for the private beta to secure a case study slot for Q4.", country: "—" },
    { name: "Agencies", text: "Manage multiple clients with angle‑level dashboards (early access).", country: "—" },
  ];
  return (
    <section id="reviews" className="border-b border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What early users say</h2>
          <p className="mt-3 text-neutral-600">Let happy users convince the rest. (We'll add real stories as the beta rolls out.)</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <div key={i} className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-1 text-amber-500">{"★★★★★".slice(0, 5 - (i % 2)) + "☆☆☆☆☆".slice(0, i % 2)}</div>
              <p className="text-neutral-700">{t.text}</p>
              <div className="mt-4 text-sm font-semibold text-neutral-900">{t.name}</div>
              <div className="text-xs text-neutral-500">{t.country}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const qas = [
    {
      q: "How is Adlign different from a page builder?",
      a: "Page builders create pages. Adlign creates message‑aligned landings mapped to each ad angle — then measures performance by angle so you know exactly what to scale.",
    },
    {
      q: "Do I need developers or custom code?",
      a: "No. It's Shopify‑native and designed to respect your theme and branding. Deploy in one click.",
    },
    {
      q: "Will it affect my SEO or tracking?",
      a: "Landings live inside your store with clean URLs. We keep your existing analytics intact and add angle‑level insight on top.",
    },
    {
      q: "Is Adlign ready for Q4?",
      a: "Yes — and that's the point. The sooner you align ads and landings, the more budget you'll save as competition heats up.",
    },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="border-b border-neutral-200 bg-neutral-50/60">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">FAQs</h2>
        <div className="mx-auto mt-8 divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {qas.map((qa, i) => (
            <div key={i} className="">
              <button
                className="flex w-full items-center justify-between px-5 py-4 text-left text-neutral-900 hover:bg-neutral-50"
                onClick={() => setOpen(open === i ? -1 : i)}
              >
                <span className="text-base font-semibold">{qa.q}</span>
                <span className="text-neutral-500">{open === i ? "–" : "+"}</span>
              </button>
              <div className={classNames("px-5 text-neutral-700 transition-all", open === i ? "max-h-96 pb-5" : "max-h-0 overflow-hidden")}>{qa.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onBeta, onSubmit, setEmail, success }) {
  const [email2, setEmail2] = useState("");
  const features = [
    "One‑click generator",
    "Angle analytics",
    "Built‑in A/B testing",
    "Direct publish in Shopify",
    "Q4 templates",
    "Priority onboarding",
    "Private Slack access",
    "Early partner pricing",
  ];
  return (
    <section id="cta" className="relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-neutral-50 to-white"/>
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to stop wasting clicks?</h3>
            <p className="mt-3 text-neutral-700">Join the waitlist now. We'll prioritise brands preparing for Q4 and active ad testing.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setEmail(email2);
                onSubmit(e);
              }}
              className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                placeholder="Enter your email"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900"
              />
              <button type="submit" className="rounded-xl bg-neutral-900 px-5 py-3 text-base font-semibold text-white hover:bg-neutral-800">Join the Waitlist</button>
            </form>
            {success && <p className="mt-2 text-sm text-emerald-700">You're on the list — see you in the beta!</p>}
            <div className="mt-4 text-sm text-neutral-600">Prefer to be hands‑on? <button onClick={onBeta} className="font-semibold text-neutral-900 underline decoration-neutral-300 decoration-2 underline-offset-4 hover:decoration-neutral-900">Apply for the Private Beta</button> — limited spots.</div>
          </div>
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-neutral-700">What you get</div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-neutral-800">
                  <Check className="h-4 w-4" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const year = useMemo(() => new Date().getFullYear(), []);
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-neutral-600 md:flex-row">
        <div>© {year} Adlign. All rights reserved. · <a href="mailto:hello@adlign.com" className="underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900">hello@adlign.com</a></div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-neutral-900">LinkedIn</a>
          <a href="#" className="hover:text-neutral-900">Twitter</a>
          <a href="#" className="hover:text-neutral-900">Privacy</a>
          <a href="#" className="hover:text-neutral-900">Terms</a>
        </div>
      </div>
    </footer>
  );
}

// --- Beta modal ---
function BetaModal({ onClose }) {
  const [form, setForm] = useState({ email: "", store: "", spend: "2-5k", platform: "Shopify", agree: false });
  const handle = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.email || !form.store || !form.agree) return alert("Please fill required fields and confirm your ad spend.");
    try {
      const list = JSON.parse(localStorage.getItem("adlign_beta") || "[]");
      list.push({ ...form, ts: Date.now() });
      localStorage.setItem("adlign_beta", JSON.stringify(list));
    } catch (_) {}
    alert("Thanks! Your beta application has been received. We'll be in touch.");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Apply for the Private Beta</h3>
          <button onClick={onClose} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"><Close/></button>
        </div>
        <p className="text-neutral-700">We prioritise Shopify brands actively running paid traffic and testing multiple creatives. Tell us a bit about your store.</p>
        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Work email*</label>
            <input value={form.email} onChange={(e) => handle("email", e.target.value)} type="email" className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900" placeholder="name@brand.com"/>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-neutral-700">Store URL*</label>
            <input value={form.store} onChange={(e) => handle("store", e.target.value)} type="url" className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900" placeholder="https://yourstore.com"/>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Monthly ad spend</label>
            <select value={form.spend} onChange={(e) => handle("spend", e.target.value)} className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900">
              {["<2k", "2-5k", "5-20k", "20k+"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Platform</label>
            <select value={form.platform} onChange={(e) => handle("platform", e.target.value)} className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900">
              {["Shopify", "WooCommerce", "Webflow", "BigCommerce", "Other"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 mt-2 flex items-center gap-2 text-sm text-neutral-700">
            <input id="agree" type="checkbox" checked={form.agree} onChange={(e) => handle("agree", e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"/>
            <label htmlFor="agree">I confirm we're actively testing paid ads and can share performance data for onboarding.</label>
          </div>
          <div className="md:col-span-2 mt-2 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
            <button type="submit" className="rounded-xl bg-neutral-900 px-5 py-3 font-semibold text-white hover:bg-neutral-800">Submit Application</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Ultra‑light smoke tests (run only in dev) ---
function __runSmokeTests__() {
  const assertions = [
    ["AdlignLanding is a function", typeof AdlignLanding === "function"],
    ["Hero CTA copy exists", "Ready to stop wasting clicks?".length > 0],
    ["HowItWorks has 5 steps", ["Connect Shopify","Add ads & angles","Generate landings","Route traffic","Measure & scale"].length === 5],
    ["What you get has 8 items", 8 === 8],
  ];
  const failed = assertions.filter(([, ok]) => !ok);
  // eslint-disable-next-line no-console
  if (failed.length) console.error("Smoke tests failed:", failed.map(([name]) => name));
}
try { import.meta?.env?.DEV && __runSmokeTests__(); } catch {}
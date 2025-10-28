import Link from "next/link";
import { Mail, Send, Twitter } from "lucide-react";

const footerLinks = [
  {
    heading: "Platform",
    links: [
      { label: "Solotto $LOTTO Project Site", href: "https://solotto.live" },
      { label: "Lottery History", href: "https://solotto-lottery-dapp-frontend.vercel.app/dashboard/history" },
      { label: "Transparency", href: "https://solotto-lottery-dapp-frontend.vercel.app/transparency" },
      { label: "Legal", href: "https://solotto.live/legal" },
    ],
  },
  {
    heading: "Get in Touch",
    links: [
      { label: "SolottoOnSol@gmail.com", href: "mailto:SolottoOnSol@gmail.com" },
    ],
  },
];

const socialLinks = [
  {
    label: "Solotto on X",
    href: "https://x.com/solottoonsol",
    icon: Twitter,
  },
  {
    label: "Solotto on Telegram",
    href: "https://t.me/+_F9sVPy3WG4zNTZh",
    icon: Send,
  },
  {
    label: "Email Solotto",
    href: "mailto:SolottoOnSol@gmail.com",
    icon: Mail,
  },
];

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-primary/15 bg-night-900/80 backdrop-blur supports-[backdrop-filter]:bg-night-900/60">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16 lg:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md space-y-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-primary shadow-[0_0_16px_rgba(34,211,238,0.55)]" />
              <span className="text-2xl font-semibold tracking-wide brand-gradient">SOLOTTO</span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-300">
              Purpose-built for transparent, auditable Solana lotteries. Monitor drawing integrity, follow the prize pool, and stay plugged into the ecosystem from a single control surface.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="group inline-flex items-center justify-center rounded-full border border-primary/20 bg-night-800/70 p-2.5 text-slate-200 transition hover:border-primary/40 hover:bg-night-700 hover:text-primary hover:shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                >
                  <Icon className="h-4 w-4 transition-transform group-hover:-translate-y-px" strokeWidth={1.75} />
                </Link>
              ))}
            </div>
          </div>

          <div className="grid flex-1 gap-8 sm:grid-cols-2">
            {footerLinks.map((section) => (
              <div key={section.heading} className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {section.heading}
                </h3>
                <ul className="space-y-3 text-sm">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="inline-flex items-center gap-1 text-slate-200 transition hover:text-primary"
                      >
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-primary/10 bg-night-900/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <p>© {currentYear} Solotto. All rights reserved.</p>
          <p className="text-slate-500">
            Built for provable fairness, operator accountability, and community trust.
          </p>
        </div>
      </div>
    </footer>
  );
}

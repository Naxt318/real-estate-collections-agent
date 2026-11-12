import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { TEXT_LINK_CLASSES } from '@/components/auth/auth-link';
import { buttonClasses } from '@/components/ui/button';

const STEPS = [
  {
    title: 'Connect your CRM',
    text: 'Bring in customers, bookings and payment schedules from the system you already use.',
  },
  {
    title: "Spot what's due",
    text: 'See upcoming and overdue instalments, and which buyers are at risk of paying late.',
  },
  {
    title: 'AI calls homebuyers',
    text: 'Polite reminders, payment links and recorded promises. Disputes go straight to your team.',
  },
  {
    title: 'Track every rupee',
    text: 'Payments count only once they are verified with the payment gateway.',
  },
];

const FEATURES = [
  {
    title: 'Explainable risk scores',
    text: 'A clear, rules-based score for every buyer, with the reasons behind it.',
  },
  { title: 'Promise tracking', text: 'Know who promised to pay, when, and who missed it.' },
  {
    title: 'Your data stays yours',
    text: "Each developer's data is fully separated from everyone else's.",
  },
];

function CtaLink({
  variant,
  children,
}: {
  variant: 'primary' | 'secondary' | 'inverted';
  children: string;
}) {
  return (
    <Link href="/login" className={buttonClasses(variant, 'lg')}>
      {children}
    </Link>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-2 sm:gap-6">
            <a
              href="#how-it-works"
              className="hidden text-sm text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              How it works
            </a>
            <a
              href="#features"
              className="hidden text-sm text-zinc-600 hover:text-zinc-900 sm:inline dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Features
            </a>
            <Link href="/login" className={`px-2 ${TEXT_LINK_CLASSES}`}>
              Sign in
            </Link>
            <CtaLink variant="primary">Get started</CtaLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 to-white px-4 py-20 sm:py-28 dark:from-indigo-950/40 dark:to-zinc-950">
          <div
            aria-hidden="true"
            className="absolute top-0 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-800/20"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              For real estate developers
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-5xl dark:text-zinc-50">
              Collect every instalment on time, without chasing every buyer.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-zinc-600 dark:text-zinc-400">
              An AI assistant calls homebuyers on your behalf, reminds them about due instalments,
              shares payment links and tells your team who needs a human follow-up.
            </p>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <CtaLink variant="primary">Get started</CtaLink>
              <CtaLink variant="secondary">Sign in</CtaLink>
            </div>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how-heading" className="px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <h2
              id="how-heading"
              className="text-center text-sm font-semibold tracking-widest text-indigo-600 uppercase dark:text-indigo-400"
            >
              How it works
            </h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-100">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-heading"
          className="bg-zinc-50 px-4 py-20 dark:bg-zinc-900/40"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              id="features-heading"
              className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              Built for collections teams
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl bg-white p-6 shadow-xs ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
                >
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl bg-gradient-to-br from-indigo-700 to-indigo-950 px-6 py-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Ready to reduce overdue receivables?
            </h2>
            <CtaLink variant="inverted">Get started</CtaLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        © Collections Intelligence
      </footer>
    </div>
  );
}

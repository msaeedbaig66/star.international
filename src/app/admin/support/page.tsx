import Link from 'next/link'

const quickActions = [
  {
    title: 'Trust & Safety Queue',
    description: 'Review active reports and apply moderation actions.',
    href: '/admin/reports',
    icon: 'shield',
  },
  {
    title: 'Chats Monitor',
    description: 'Audit user conversations for platform safety incidents.',
    href: '/admin/chats',
    icon: 'forum',
  },
  {
    title: 'Listings Queue',
    description: 'Approve or reject pending marketplace submissions.',
    href: '/admin/listings',
    icon: 'inventory_2',
  },
]

const playbookSteps = [
  'Triage severity and classify: fraud, harassment, spam, or policy breach.',
  'Add clear admin message with required user fix and expected deadline.',
  'Apply Warn, Freeze, or Remove action based on risk level.',
  'Use 48-hour undo if report was resolved or action was too strict.',
]

export default function AdminSupportPage() {
  return (
    <div className="space-y-10 pb-24">
      <header className="rounded-[2.5rem] bg-white border border-border overflow-hidden">
        <div className="grid md:grid-cols-[1.2fr,1fr]">
          <div className="p-8 md:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Admin Support</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-text-primary mt-2">Operations Help Desk</h1>
            <p className="text-text-secondary mt-4 max-w-xl leading-relaxed">
              Central control for moderation escalation, response playbooks, and fast links to high-impact admin tasks.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a
                href="mailto:star.international.sgi@gmail.com?subject=Admin%20Escalation%20Request"
                className="px-6 py-3 rounded-full bg-primary text-white font-black text-xs uppercase tracking-[0.18em] hover:bg-primary-hover transition-colors"
              >
                Escalate by Email
              </a>
              <Link
                href="/admin/reports"
                className="px-6 py-3 rounded-full border border-border bg-surface text-text-primary font-black text-xs uppercase tracking-[0.18em] hover:bg-white transition-colors"
              >
                Open Reports
              </Link>
            </div>
          </div>
          <div className="bg-surface p-8 md:p-10 border-t md:border-t-0 md:border-l border-border">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Incident Playbook</p>
            <ol className="mt-5 space-y-4">
              {playbookSteps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-text-primary">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-black text-text-primary tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group bg-white rounded-3xl border border-border p-6 hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">{action.icon}</span>
              </div>
              <h3 className="text-base font-black text-text-primary mt-4 group-hover:text-primary transition-colors">{action.title}</h3>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">{action.description}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-5">Open Workspace</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-white p-7">
        <h2 className="text-lg font-black text-text-primary">Support Contacts</h2>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-surface border border-border p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Trust Team</p>
            <a className="text-sm font-bold text-primary mt-2 inline-block hover:underline" href="mailto:star.international.sgi@gmail.com">
              star.international.sgi@gmail.com
            </a>
          </div>
          <div className="rounded-2xl bg-surface border border-border p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Engineering</p>
            <a className="text-sm font-bold text-primary mt-2 inline-block hover:underline" href="mailto:star.international.sgi@gmail.com">
              star.international.sgi@gmail.com
            </a>
          </div>
          <div className="rounded-2xl bg-surface border border-border p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">Policy Escalation</p>
            <a className="text-sm font-bold text-primary mt-2 inline-block hover:underline" href="mailto:star.international.sgi@gmail.com">
              star.international.sgi@gmail.com
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

const foundations = [
  {
    title: 'Contratos compartilhados',
    description: 'Schemas Zod mantêm servidor e interface alinhados.',
  },
  {
    title: 'Runtime persistente',
    description: 'Bootstrap idempotente preparado para a conexão Ethereum.',
  },
  {
    title: 'Configuração segura',
    description: 'Segredos são validados exclusivamente no servidor.',
  },
] as const

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.85)]"
          />
          <span className="text-sm font-semibold tracking-[0.2em] text-slate-200 uppercase">
            Alphractal Fees
          </span>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200">
          Fundação pronta
        </span>
      </header>

      <section className="flex flex-1 flex-col justify-center py-20">
        <p className="mb-5 text-sm font-medium tracking-[0.24em] text-cyan-300 uppercase">
          Ethereum fee intelligence
        </p>
        <h1 className="max-w-4xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl">
          A base tipada para monitorar taxas da Ethereum em tempo real.
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
          O projeto está preparado para receber ingestão via WebSocket, histórico
          PostgreSQL e atualização do dashboard por SSE.
        </p>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {foundations.map((foundation) => (
            <article
              key={foundation.title}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur"
            >
              <h2 className="text-base font-semibold text-slate-100">
                {foundation.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {foundation.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

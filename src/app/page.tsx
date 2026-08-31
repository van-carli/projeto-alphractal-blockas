'use client'

import {
  feeHistoryFixture,
  feeSnapshotFixture,
  telemetryHealthFixture,
} from '@/test/fixtures/fees'

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
  }).format(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function getStatusClass(
  status: 'healthy' | 'degraded' | 'unhealthy',
) {
  if (status === 'healthy') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  }

  if (status === 'degraded') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
  }

  return 'border-red-400/20 bg-red-400/10 text-red-300'
}

function getCongestionClass(
  congestion: 'low' | 'normal' | 'high' | 'critical',
) {
  if (congestion === 'low') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
  }

  if (congestion === 'normal') {
    return 'border-blue-400/20 bg-blue-400/10 text-blue-300'
  }

  if (congestion === 'high') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-300'
  }

  return 'border-red-400/20 bg-red-400/10 text-red-300'
}

export default function Home() {
  /*
   * Task 2:
   * A página está usando fixtures temporariamente para permitir
   * a visualização do dashboard sem uma chave RPC.
   *
   * Quando a integração real for habilitada, estes valores poderão
   * voltar a vir dos hooks da API.
   */
  const snapshot = feeSnapshotFixture
  const history = feeHistoryFixture
  const health = telemetryHealthFixture

  return (
    <main className="min-h-screen bg-[#030711] text-slate-100">
      <Header healthStatus={health.status} />

      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-6 lg:py-8">
            {/* Page heading */}
            <section className="mb-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.08px] text-blue-400">
                    Ethereum Fee Intelligence
                  </p>

                  <h1 className="text-[30px] font-bold leading-9 tracking-tight text-white">
                    Fee Dashboard
                  </h1>

                  <p className="mt-2 text-sm leading-5 text-slate-400">
                    Monitoramento das taxas da Ethereum em tempo real.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-[#1D2839] bg-[#0F1729] px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[1px] text-slate-500">
                      Current Block
                    </p>

                    <p className="mt-1 font-mono text-sm font-medium tabular-nums text-white">
                      #{snapshot.blockNumber}
                    </p>
                  </div>

                  <div
                    className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide ${getStatusClass(
                      health.status,
                    )}`}
                  >
                    {health.status}
                  </div>
                </div>
              </div>
            </section>

            {/* KPI strip */}
            <section className="grid gap-px overflow-hidden rounded-lg border border-[#1D2839] bg-[#1D2839] sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Base Fee"
                value={`${formatNumber(snapshot.baseFeeGwei)} Gwei`}
                description="Current network fee"
              />

              <MetricCard
                label="ETH / USD"
                value={formatUsd(snapshot.ethUsd)}
                description="Current ETH price"
              />

              <MetricCard
                label="Gas Used"
                value={`${formatNumber(snapshot.gasUsedRatio * 100)}%`}
                description="Block utilization"
              />

              <MetricCard
                label="Congestion"
                value={snapshot.congestionLevel}
                description="Network activity"
                valueClass={getCongestionClass(snapshot.congestionLevel)}
              />
            </section>

            {/* Main panels */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Priority fees */}
              <section className="rounded-lg border border-[#1D2839] bg-[#0F1729] p-5 md:p-6">
                <SectionTitle
                  title="Priority Fees"
                  description="Estimativa por velocidade da transação."
                />

                <div className="mt-6 space-y-0">
                  <FeeRow
                    label="Slow"
                    description="Lower priority"
                    value={snapshot.priorityFeeGwei.slow}
                  />

                  <FeeRow
                    label="Standard"
                    description="Recommended"
                    value={snapshot.priorityFeeGwei.standard}
                    highlighted
                  />

                  <FeeRow
                    label="Fast"
                    description="Higher priority"
                    value={snapshot.priorityFeeGwei.fast}
                  />
                </div>
              </section>

              {/* System health */}
              <section className="rounded-lg border border-[#1D2839] bg-[#0F1729] p-5 md:p-6">
                <SectionTitle
                  title="System Health"
                  description="Estado atual da infraestrutura de telemetria."
                />

                <div className="mt-5">
                  <HealthRow
                    label="System Status"
                    value={health.status}
                    status={health.status}
                  />

                  <HealthRow
                    label="RPC Connection"
                    value={
                      health.rpcConnected
                        ? 'Connected'
                        : 'Disconnected'
                    }
                    positive={health.rpcConnected}
                  />

                  <HealthRow
                    label="Price Feed"
                    value={health.priceStatus}
                    positive={health.priceStatus === 'fresh'}
                  />

                  <HealthRow
                    label="SSE Clients"
                    value={String(health.sseClients)}
                  />

                  <HealthRow
                    label="Last Block"
                    value={health.lastBlock ?? '—'}
                  />

                  <HealthRow
                    label="Last Block At"
                    value={formatDate(health.lastBlockAt)}
                    last
                  />
                </div>
              </section>
            </div>

            {/* Estimated costs */}
            <section className="mt-6 rounded-lg border border-[#1D2839] bg-[#0F1729] p-5 md:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <SectionTitle
                  title="Estimated Costs"
                  description="Custo estimado das operações usando o snapshot atual."
                />

                <span className="rounded bg-[#030711] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.8px] text-slate-500">
                  Fixture snapshot
                </span>
              </div>

              <DataTable>
                <thead>
                  <tr className="border-b border-[#1D2839]">
                    <TableHead>Operation</TableHead>
                    <TableHead>Gas</TableHead>
                    <TableHead>Slow</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Fast</TableHead>
                  </tr>
                </thead>

                <tbody>
                  {snapshot.estimatedCosts.map((cost) => (
                    <tr
                      key={cost.operation}
                      className="border-b border-[#131D34] last:border-0"
                    >
                      <TableCell strong>
                        {cost.operation}
                      </TableCell>

                      <TableCell mono>
                        {formatNumber(cost.gasUnits, 0)}
                      </TableCell>

                      <TableCell>
                        {formatUsd(cost.slowUsd)}
                      </TableCell>

                      <TableCell strong>
                        {formatUsd(cost.standardUsd)}
                      </TableCell>

                      <TableCell>
                        {formatUsd(cost.fastUsd)}
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </section>

            {/* History */}
            <section className="mt-6 rounded-lg border border-[#1D2839] bg-[#0F1729] p-5 md:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <SectionTitle
                  title="Fee History"
                  description="Snapshots recentes de fees."
                />

                <span className="text-xs text-slate-500">
                  {history.length} snapshots
                </span>
              </div>

              <DataTable>
                <thead>
                  <tr className="border-b border-[#1D2839]">
                    <TableHead>Block</TableHead>
                    <TableHead>Base Fee</TableHead>
                    <TableHead>Gas Used</TableHead>
                    <TableHead>Congestion</TableHead>
                    <TableHead>ETH / USD</TableHead>
                  </tr>
                </thead>

                <tbody>
                  {history.map((item) => (
                    <tr
                      key={`${item.sequence}-${item.blockNumber}`}
                      className="border-b border-[#131D34] last:border-0"
                    >
                      <TableCell strong mono>
                        #{item.blockNumber}
                      </TableCell>

                      <TableCell mono>
                        {formatNumber(item.baseFeeGwei)} Gwei
                      </TableCell>

                      <TableCell mono>
                        {formatNumber(item.gasUsedRatio * 100)}%
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${getCongestionClass(
                            item.congestionLevel,
                          )}`}
                        >
                          {item.congestionLevel}
                        </span>
                      </TableCell>

                      <TableCell mono>
                        {formatUsd(item.ethUsd)}
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </section>

            {/* Footer */}
            <footer className="flex flex-col gap-2 border-t border-[#131D34] py-6 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Alphractal Fees · Ethereum telemetry
              </span>

              <span>
                Last update {formatDate(snapshot.timestamp)}
              </span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  )
}

function Header({
  healthStatus,
}: {
  healthStatus?: 'healthy' | 'degraded' | 'unhealthy'
}) {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-[#131D34] bg-[#030711]/95 backdrop-blur-[18px]">
      <div className="mx-auto flex h-full w-full max-w-[1920px] items-center justify-between px-4">
        <div className="flex h-full items-center gap-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 text-xs font-bold text-white shadow-[0_10px_15px_-3px_rgba(59,130,246,.2)]"
            >
              A
            </span>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-tight text-white">
                Alphractal
              </p>

              <p className="text-[9px] font-semibold uppercase tracking-[0.8px] text-slate-500">
                Fees
              </p>
            </div>
          </div>

          <nav className="hidden h-full items-center gap-1 md:flex">
            <HeaderTab active>Dashboard</HeaderTab>
            <HeaderTab>Analytics</HeaderTab>
            <HeaderTab>History</HeaderTab>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-[#1D2839] bg-[#0F1729] px-3 py-2 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

            <span className="text-xs font-medium text-slate-300">
              Ethereum
            </span>
          </div>

          <div
            className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide md:hidden ${
              healthStatus
                ? getStatusClass(healthStatus)
                : 'border-[#1D2839] text-slate-500'
            }`}
          >
            {healthStatus ?? 'Loading'}
          </div>

          <button
            type="button"
            className="hidden rounded-lg border border-[#1D2839] bg-[#0F1729] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-[#2D3D58] hover:text-white lg:block"
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  )
}

function HeaderTab({
  children,
  active = false,
}: {
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={`relative flex h-full items-center px-3 text-xs font-medium transition ${
        active
          ? 'text-white'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {children}

      {active && (
        <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-500" />
      )}
    </button>
  )
}

function Sidebar() {
  return (
    <aside className="hidden w-[240px] shrink-0 border-r border-[#131D34] bg-[#0B111E] lg:flex lg:flex-col">
      <div className="flex-1 p-4">
        <div className="mb-6">
          <p className="px-3 text-[9px] font-semibold uppercase tracking-[1.08px] text-slate-600">
            Monitoring
          </p>

          <div className="mt-2 space-y-1">
            <SidebarItem label="Fee Overview" active />
            <SidebarItem label="Priority Fees" />
            <SidebarItem label="Gas Analytics" />
            <SidebarItem label="Network Health" />
          </div>
        </div>

        <div>
          <p className="px-3 text-[9px] font-semibold uppercase tracking-[1.08px] text-slate-600">
            Data
          </p>

          <div className="mt-2 space-y-1">
            <SidebarItem label="Fee History" />
            <SidebarItem label="Estimated Costs" />
          </div>
        </div>
      </div>

      <div className="border-t border-[#131D34] p-4">
        <p className="px-3 text-[9px] font-semibold uppercase tracking-[1px] text-slate-600">
          System
        </p>

        <p className="mt-2 px-3 text-[10px] leading-4 text-slate-600">
          Ethereum fee telemetry
        </p>
      </div>
    </aside>
  )
}

function SidebarItem({
  label,
  active = false,
}: {
  label: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center rounded-md px-3 py-2.5 text-left text-xs font-medium transition ${
        active
          ? 'border border-blue-500/20 bg-blue-500/10 text-blue-300'
          : 'border border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-300'
      }`}
    >
      <span
        className={`mr-3 h-1.5 w-1.5 rounded-full ${
          active ? 'bg-blue-400' : 'bg-slate-700'
        }`}
      />

      {label}
    </button>
  )
}

function MetricCard({
  label,
  value,
  description,
  valueClass,
}: {
  label: string
  value: string
  description: string
  valueClass?: string
}) {
  return (
    <article className="min-w-[130px] bg-[#0F1729] px-4 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.8px] text-slate-500">
        {label}
      </p>

      {valueClass ? (
        <div className="mt-2">
          <span
            className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold uppercase ${valueClass}`}
          >
            {value}
          </span>
        </div>
      ) : (
        <p className="mt-2 font-mono text-lg font-semibold tracking-tight tabular-nums text-white">
          {value}
        </p>
      )}

      <p className="mt-1 text-[10px] leading-4 text-slate-600">
        {description}
      </p>
    </article>
  )
}

function SectionTitle({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="text-xl font-bold leading-7 tracking-tight text-white">
        {title}
      </h2>

      <p className="mt-1 text-xs leading-[19.5px] text-slate-500">
        {description}
      </p>
    </div>
  )
}

function FeeRow({
  label,
  description,
  value,
  highlighted = false,
}: {
  label: string
  description: string
  value: number
  highlighted?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-[#131D34] py-3.5 last:border-0 ${
        highlighted ? 'rounded-md bg-white/[0.02] px-3' : ''
      }`}
    >
      <div>
        <p className="text-sm font-medium text-slate-200">
          {label}
        </p>

        <p className="mt-0.5 text-[10px] text-slate-600">
          {description}
        </p>
      </div>

      <div className="text-right">
        <p className="font-mono text-sm font-semibold tabular-nums text-white">
          {formatNumber(value)}
        </p>

        <p className="text-[10px] text-slate-600">
          Gwei
        </p>
      </div>
    </div>
  )
}

function HealthRow({
  label,
  value,
  positive = false,
  status,
  last = false,
}: {
  label: string
  value: string
  positive?: boolean
  status?: 'healthy' | 'degraded' | 'unhealthy'
  last?: boolean
}) {
  const statusClass = status
    ? getStatusClass(status)
    : positive
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
      : 'border-[#1D2839] bg-[#030711] text-slate-400'

  return (
    <div
      className={`flex items-center justify-between py-3 ${
        last ? '' : 'border-b border-[#131D34]'
      }`}
    >
      <span className="text-xs font-medium text-slate-500">
        {label}
      </span>

      {status || positive ? (
        <span
          className={`rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${statusClass}`}
        >
          {value}
        </span>
      ) : (
        <span className="font-mono text-xs font-medium tabular-nums text-slate-300">
          {value}
        </span>
      )}
    </div>
  )
}

function DataTable({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left">
        {children}
      </table>
    </div>
  )
}

function TableHead({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <th className="px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.8px] text-slate-600 first:pl-0">
      {children}
    </th>
  )
}

function TableCell({
  children,
  strong = false,
  mono = false,
}: {
  children: React.ReactNode
  strong?: boolean
  mono?: boolean
}) {
  return (
    <td
      className={`px-2 py-2.5 text-xs first:pl-0 ${
        strong
          ? 'font-semibold text-slate-200'
          : 'text-slate-400'
      } ${mono ? 'font-mono tabular-nums' : ''}`}
    >
      {children}
    </td>
  )
}
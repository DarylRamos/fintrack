"use client";

import { useSyncExternalStore } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

// The sign-in panel's picture: a laptop showing a small FinTrack dashboard, in front of two chart
// cards that it partly covers. Sample figures only; decorative, so it is hidden from assistive
// technology and can't be focused (the wrapper in auth-showcase-loader.tsx is aria-hidden and inert).
// Everything animates once on load (laptop, then the cards, then the charts drawing in) and is still
// afterwards; with reduced motion it simply appears. Text in the mock-up is drawn as bars, so nothing
// falls under the 12px minimum. Sizes inside the laptop use container units (cqw) so it scales with
// the panel. See context/ui-context.md, Sign-In and Sign-Up.

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

const trend = [
  { month: "Jun", income: 4100, spending: 3500 },
  { month: "Jul", income: 4350, spending: 3800 },
  { month: "Aug", income: 4250, spending: 3300 },
  { month: "Sep", income: 4600, spending: 3650 },
  { month: "Oct", income: 4700, spending: 3250 },
  { month: "Nov", income: 5000, spending: 3400 },
];

// Sorted, largest first (ui-context.md, Charts).
const categories = [
  { name: "Housing", amount: 1400 },
  { name: "Food", amount: 650 },
  { name: "Transport", amount: 380 },
  { name: "Utilities", amount: 240 },
];

const balance = [
  { month: "Jun", value: 9800 },
  { month: "Jul", value: 10700 },
  { month: "Aug", value: 11900 },
  { month: "Sep", value: 13100 },
  { month: "Oct", value: 14550 },
  { month: "Nov", value: 16150 },
];

// Percent of each budget used; the last is nearing its limit, so it uses the warning colour.
const budgets = [
  { name: "Food", used: 55 },
  { name: "Transport", used: 70 },
  { name: "Leisure", used: 88 },
];

const config = {
  income: { label: "Income", color: "var(--chart-primary)" },
  spending: { label: "Spending", color: "var(--chart-secondary)" },
  amount: { label: "Amount", color: "var(--chart-primary)" },
  value: { label: "Balance", color: "var(--chart-primary)" },
  used: { label: "Used", color: "var(--chart-primary)" },
} satisfies ChartConfig;

const CHART_CLASS = "aspect-auto h-full w-full";
const DURATION = 1000;

// Entry animations (tw-animate-css). `fill-mode-[backwards]` keeps a delayed item hidden until it
// starts.
const ENTER = "animate-in fade-in duration-700 fill-mode-[backwards] motion-reduce:animate-none";

function TextBar({ className }: { className: string }) {
  return <div className={`rounded-full ${className}`} />;
}

function CardHeading() {
  return (
    <div className="flex flex-col gap-1.5">
      <TextBar className="h-2 w-1/3 bg-fill" />
      <TextBar className="h-3 w-1/2 bg-ink/80" />
    </div>
  );
}

function MiniDashboard({ animate }: { animate: boolean }) {
  return (
    <div className="flex h-full @container">
      {/* Sidebar */}
      <div className="flex w-[22%] flex-col gap-[2cqw] border-r border-line bg-surface p-[2cqw]">
        <TextBar className="mb-[1cqw] h-[2.2cqw] w-[70%] bg-ink" />
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className={`flex items-center gap-[1.2cqw] rounded-[1cqw] p-[0.8cqw] ${item === 0 ? "bg-inverse" : ""}`}
          >
            <div className="size-[2.6cqw] shrink-0 rounded-[0.7cqw] border border-line bg-surface" />
            <TextBar className={`h-[1.1cqw] flex-1 ${item === 0 ? "bg-on-inverse/70" : "bg-fill"}`} />
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col gap-[2cqw] p-[2.5cqw]">
        <div className="flex items-center justify-between">
          <div className="flex w-1/2 flex-col gap-[0.8cqw]">
            <TextBar className="h-[1.1cqw] w-[40%] bg-fill" />
            <TextBar className="h-[2cqw] w-[65%] bg-ink" />
          </div>
          <div className="size-[3.6cqw] rounded-full bg-inverse" />
        </div>

        <div className="grid grid-cols-4 gap-[1.5cqw]">
          {[0, 1, 2, 3].map((tile) => (
            <div
              key={tile}
              className="flex flex-col gap-[0.8cqw] rounded-[1.2cqw] border border-line bg-surface p-[1.4cqw]"
            >
              <TextBar className="h-[1cqw] w-[60%] bg-fill" />
              <TextBar className="h-[1.8cqw] w-[80%] bg-ink/80" />
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-3 gap-[1.5cqw]">
          <div className="col-span-2 flex min-h-0 flex-col gap-[1cqw] rounded-[1.2cqw] border border-line bg-surface p-[1.4cqw]">
            <TextBar className="h-[1.1cqw] w-[30%] bg-fill" />
            <div className="min-h-0 flex-1">
              <ChartContainer config={config} className={CHART_CLASS}>
                <AreaChart data={balance} margin={{ top: 4, right: 2, bottom: 0, left: 2 }} accessibilityLayer={false}>
                  <YAxis hide domain={["dataMin - 3000", "dataMax"]} />
                  <Area
                    dataKey="value"
                    type="monotone"
                    stroke="var(--color-value)"
                    strokeWidth={1.5}
                    fill="var(--color-value)"
                    fillOpacity={0.12}
                    isAnimationActive={animate}
                    animationBegin={300}
                    animationDuration={DURATION}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          </div>
          <div className="flex min-h-0 flex-col gap-[1cqw] rounded-[1.2cqw] border border-line bg-surface p-[1.4cqw]">
            <TextBar className="h-[1.1cqw] w-[50%] bg-fill" />
            <div className="min-h-0 flex-1">
              <ChartContainer config={config} className={CHART_CLASS}>
                <BarChart
                  data={budgets}
                  layout="vertical"
                  margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
                  barCategoryGap="30%"
                  accessibilityLayer={false}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Bar
                    dataKey="used"
                    radius={999}
                    background={{ fill: "var(--bg-muted)", radius: 999 }}
                    isAnimationActive={animate}
                    animationBegin={400}
                    animationDuration={DURATION}
                  >
                    {budgets.map((budget) => (
                      <Cell
                        key={budget.name}
                        fill={budget.used >= 80 ? "var(--state-warning)" : "var(--color-used)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthShowcase() {
  const animate = !usePrefersReducedMotion();

  return (
    <div className="absolute inset-0">
      {/* Income against spending: behind the laptop, top right */}
      <div
        className={`absolute top-0 right-0 flex h-[42%] w-[56%] flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-sm slide-in-from-right-4 delay-150 dark:shadow-none ${ENTER}`}
      >
        <div className="pl-[22%]">
          <CardHeading />
        </div>
        <div className="min-h-0 flex-1">
          <ChartContainer config={config} className={CHART_CLASS}>
            <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }} accessibilityLayer={false}>
              <CartesianGrid vertical={false} strokeOpacity={0.5} />
              <XAxis dataKey="month" hide />
              <YAxis hide domain={["dataMin - 300", "dataMax + 200"]} />
              <Line
                dataKey="income"
                type="monotone"
                stroke="var(--color-income)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={animate}
                animationBegin={550}
                animationDuration={DURATION}
              />
              <Line
                dataKey="spending"
                type="monotone"
                stroke="var(--color-spending)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={animate}
                animationBegin={650}
                animationDuration={DURATION}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </div>

      {/* Spending by category: behind the laptop, bottom right */}
      <div
        className={`absolute right-[4%] bottom-0 flex h-[40%] w-[52%] flex-col gap-2 rounded-2xl border border-line bg-surface p-3 shadow-sm slide-in-from-right-4 delay-300 dark:shadow-none ${ENTER}`}
      >
        <div className="pl-[30%]">
          <CardHeading />
        </div>
        <div className="min-h-0 flex-1 pl-[30%]">
          <ChartContainer config={config} className={CHART_CLASS}>
            <BarChart
              data={categories}
              layout="vertical"
              margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
              barCategoryGap="25%"
              accessibilityLayer={false}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={999}
                background={{ fill: "var(--bg-muted)", radius: 999 }}
                isAnimationActive={animate}
                animationBegin={700}
                animationDuration={DURATION}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* The laptop, in front, overlapping the cards' left edges */}
      <div className={`absolute top-[18%] left-0 z-10 w-[68%] slide-in-from-bottom-4 ${ENTER}`}>
        <div className="rounded-t-xl bg-ink p-[2.5%] pb-[3%] dark:border dark:border-line dark:bg-surface">
          <div className="aspect-16/10 overflow-hidden rounded-sm bg-page">
            <MiniDashboard animate={animate} />
          </div>
        </div>
        <div className="relative mx-[-7%] h-2.5 rounded-b-xl bg-on-inverse-muted">
          <div className="mx-auto h-1 w-1/5 rounded-b-md bg-ink/25" />
        </div>
      </div>
    </div>
  );
}

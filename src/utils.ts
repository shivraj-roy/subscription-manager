import { randomUUID } from "crypto";
import { BillingCycle, Subscription } from "./types";

export function generateId(): string {
  return randomUUID();
}

export function getFaviconUrl(name: string): string {
  const domain = name.toLowerCase().replace(/\s+/g, "");
  return `https://www.google.com/s2/favicons?domain=${domain}.com&sz=64`;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function getMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "monthly":
      return amount;
    case "yearly":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "weekly":
      return amount * 4.33;
  }
}

export function getMonthlyTotal(subscriptions: Subscription[], month: number, year: number): number {
  return subscriptions
    .filter((s) => s.isActive)
    .filter((s) => {
      if (s.billingCycle === "monthly") return true;
      const start = new Date(s.startDate);
      if (s.billingCycle === "yearly") return start.getMonth() === month;
      if (s.billingCycle === "quarterly") return (month - start.getMonth() + 12) % 3 === 0;
      return true;
    })
    .reduce((sum, s) => sum + getMonthlyEquivalent(s.amount, s.billingCycle), 0);
}

export function getSubscriptionsForDay(day: number, month: number, year: number, subscriptions: Subscription[]): Subscription[] {
  return subscriptions.filter((s) => {
    if (!s.isActive || s.billingDay !== day) return false;
    const start = new Date(s.startDate);
    const subStart = new Date(year, month, day);
    if (subStart < new Date(start.getFullYear(), start.getMonth(), start.getDate())) return false;
    switch (s.billingCycle) {
      case "monthly":
        return true;
      case "yearly":
        return start.getMonth() === month;
      case "quarterly":
        return (month - start.getMonth() + 12) % 3 === 0;
      case "weekly":
        return true;
    }
  });
}

export function getMonthSubscriptions(month: number, year: number, subscriptions: Subscription[]): Subscription[] {
  return subscriptions
    .filter((s) => s.isActive)
    .filter((s) => {
      if (s.billingCycle === "monthly") return true;
      const start = new Date(s.startDate);
      if (s.billingCycle === "yearly") return start.getMonth() === month;
      if (s.billingCycle === "quarterly") return (month - start.getMonth() + 12) % 3 === 0;
      return true;
    })
    .sort((a, b) => a.billingDay - b.billingDay);
}

export function buildCalendarMarkdown(year: number, month: number, subscriptions: Subscription[]): string {
  const today = new Date();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long" });

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDayOfWeek).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const header = `| **Sun** | **Mon** | **Tue** | **Wed** | **Thu** | **Fri** | **Sat** |`;
  const separator = `|:---:|:---:|:---:|:---:|:---:|:---:|:---:|`;

  const superscripts: Record<number, string> = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

  const rows = weeks.map((wk) => {
    const cells = wk.map((day) => {
      if (day === null) return "   ";
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      const daySubs = getSubscriptionsForDay(day, month, year, subscriptions);
      const count = daySubs.length;
      if (count === 0) return isToday ? `**• ${day}**` : `${day}`;
      const dot = count === 1 ? "●" : `●${superscripts[count] ?? `⁺`}`;
      return isToday ? `**• ${day} ${dot}**` : `**${day} ${dot}**`;
    });
    return `| ${cells.join(" | ")} |`;
  });

  const table = [header, separator, ...rows].join("\n");

  const monthSubs = getMonthSubscriptions(month, year, subscriptions);
  const subsList = monthSubs.length > 0
    ? "\n\n---\n\n### Subscriptions this month\n\n" +
      monthSubs.map((s) => `- **${s.billingDay} ${monthName}** — ${s.name} · ${formatCurrency(s.amount, s.currency)} / ${s.billingCycle}`).join("\n")
    : "\n\n---\n\n*No subscriptions this month. Press **⌘N** to add one.*";

  return `## ${monthName} ${year}\n\n${table}${subsList}`;
}

export const CATEGORIES = [
  "Entertainment",
  "Productivity",
  "Health & Fitness",
  "News & Media",
  "Software & Tools",
  "Cloud Storage",
  "Finance",
  "Other",
];

export const CURRENCIES = [
  { value: "INR", title: "INR — Indian Rupee" },
  { value: "USD", title: "USD — US Dollar" },
  { value: "EUR", title: "EUR — Euro" },
  { value: "GBP", title: "GBP — British Pound" },
  { value: "JPY", title: "JPY — Japanese Yen" },
  { value: "AUD", title: "AUD — Australian Dollar" },
  { value: "CAD", title: "CAD — Canadian Dollar" },
  { value: "SGD", title: "SGD — Singapore Dollar" },
];

export const LISTS = ["Personal", "Work", "Family"];

export const PRESET_PAYMENT_METHODS = [
  { value: "Credit Card", title: "Credit Card", icon: "💳" },
  { value: "Debit Card", title: "Debit Card", icon: "💳" },
  { value: "UPI", title: "UPI", icon: "📱" },
];

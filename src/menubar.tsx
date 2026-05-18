import { Icon, LaunchType, LocalStorage, MenuBarExtra, getPreferenceValues, launchCommand } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { exec } from "child_process";
import { useEffect } from "react";
import { useSubscriptions } from "./storage";
import { Preferences, Subscription } from "./types";
import { formatCurrency, formatCycle, getMonthlyTotal, getNextBillingDate, getSubscriptionsForDay } from "./utils";

interface RatesResponse {
  rates: Record<string, number>;
}

function diffDays(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function sendNotification(title: string, body: string) {
  const t = title.replace(/"/g, '\\"');
  const b = body.replace(/"/g, '\\"');
  exec(`osascript -e 'display notification "${b}" with title "${t}"'`);
}

async function checkAndFireNotifications(subscriptions: Subscription[], prefs: Preferences) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const reminders = [
    { key: "first", days: prefs.firstReminderDays, time: prefs.firstReminderTime },
    { key: "second", days: prefs.secondReminderDays, time: prefs.secondReminderTime },
  ].filter((r) => r.days !== "disabled");

  for (const sub of subscriptions.filter((s) => s.status === "active")) {
    const nextBilling = getNextBillingDate(sub);
    const daysUntil = diffDays(today, nextBilling);
    const billingKey = `${nextBilling.getFullYear()}-${nextBilling.getMonth()}-${nextBilling.getDate()}`;

    for (const reminder of reminders) {
      if (daysUntil !== parseInt(reminder.days)) continue;

      const [hour, minute] = reminder.time.split(":").map(Number);
      if (now.getHours() < hour || (now.getHours() === hour && now.getMinutes() < minute)) continue;

      const notifKey = `notif-${sub.id}-${billingKey}-${reminder.key}`;
      if (await LocalStorage.getItem<string>(notifKey)) continue;

      const body =
        daysUntil === 0
          ? `${sub.name} bills today — ${formatCurrency(sub.amount, sub.currency)}`
          : `${sub.name} bills in ${daysUntil} day${daysUntil > 1 ? "s" : ""} — ${formatCurrency(sub.amount, sub.currency)}`;

      sendNotification("Subscription Due", body);
      await LocalStorage.setItem(notifKey, "1");
    }
  }
}

export default function MenubarCommand() {
  const { subscriptions, isLoading } = useSubscriptions();
  const prefs = getPreferenceValues<Preferences>();
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const monthName = today.toLocaleString("default", { month: "long" });

  const { data: ratesData } = useFetch<RatesResponse>(
    `https://api.frankfurter.app/latest?from=${prefs.primaryCurrency}`,
    { keepPreviousData: true },
  );

  useEffect(() => {
    if (!isLoading && subscriptions.length > 0) {
      checkAndFireNotifications(subscriptions, prefs);
    }
  }, [isLoading]);

  const monthlyTotal = getMonthlyTotal(subscriptions, month, year, prefs.primaryCurrency, ratesData?.rates);
  const totalStr = isLoading ? "" : formatCurrency(monthlyTotal, prefs.primaryCurrency);
  const showInTitle = (prefs.showTotalIn ?? "title") !== "dropdown";

  const todaySubs = getSubscriptionsForDay(today.getDate(), month, year, subscriptions);

  const upcomingDays: { date: Date; subs: Subscription[] }[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(year, month, today.getDate() + i);
    const subs = getSubscriptionsForDay(d.getDate(), d.getMonth(), d.getFullYear(), subscriptions);
    if (subs.length > 0) upcomingDays.push({ date: d, subs });
  }

  const allThisMonth = subscriptions
    .filter((s) => s.status === "active")
    .filter((s) => {
      const start = new Date(s.startDate);
      switch (s.billingCycle) {
        case "monthly": return true;
        case "yearly": return start.getMonth() === month;
        case "quarterly": return (month - start.getMonth() + 12) % 3 === 0;
        case "half-yearly": return (month - start.getMonth() + 12) % 6 === 0;
        default: return true;
      }
    })
    .sort((a, b) => a.billingDay - b.billingDay);

  async function openCalendar() {
    await launchCommand({ name: "manage-subscription", type: LaunchType.UserInitiated });
  }

  const content = prefs.dropdownContent ?? "full-month";
  const activeCount = subscriptions.filter((s) => s.status === "active").length;

  const menuContent = (
    <>
      {!showInTitle && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={`Monthly Total: ${totalStr}`} icon={Icon.BankNote} onAction={openCalendar} />
        </MenuBarExtra.Section>
      )}

      {content === "minimal" && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={`${activeCount} active subscription${activeCount !== 1 ? "s" : ""}`} icon={Icon.List} onAction={openCalendar} />
          {todaySubs.length > 0 && (
            <MenuBarExtra.Item title={`${todaySubs.length} due today`} icon={Icon.Bell} onAction={openCalendar} />
          )}
        </MenuBarExtra.Section>
      )}

      {content !== "minimal" && todaySubs.length > 0 && (
        <MenuBarExtra.Section title="Due Today">
          {todaySubs.map((sub) => (
            <MenuBarExtra.Item
              key={sub.id}
              title={sub.name}
              subtitle={`${formatCurrency(sub.amount, sub.currency)} ${formatCycle(sub.billingCycle)}`}
              icon={{ source: sub.iconUrl ?? Icon.CreditCard, fallback: Icon.CreditCard }}
              onAction={openCalendar}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {content !== "minimal" && upcomingDays.length > 0 && (
        <MenuBarExtra.Section title="Next 7 Days">
          {upcomingDays.map(({ date, subs }) =>
            subs.map((sub) => (
              <MenuBarExtra.Item
                key={`${sub.id}-${date.getDate()}`}
                title={sub.name}
                subtitle={`${date.getDate()} ${date.toLocaleString("default", { month: "short" })} · ${formatCurrency(sub.amount, sub.currency)}`}
                icon={{ source: sub.iconUrl ?? Icon.CreditCard, fallback: Icon.CreditCard }}
                onAction={openCalendar}
              />
            )),
          )}
        </MenuBarExtra.Section>
      )}

      {content === "full-month" && (
        <MenuBarExtra.Section title={`${monthName} ${year}`}>
          {allThisMonth.map((sub) => (
            <MenuBarExtra.Item
              key={sub.id}
              title={sub.name}
              subtitle={`${sub.billingDay} · ${formatCurrency(sub.amount, sub.currency)} ${formatCycle(sub.billingCycle)}`}
              icon={{ source: sub.iconUrl ?? Icon.CreditCard, fallback: Icon.CreditCard }}
              onAction={openCalendar}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Calendar"
          icon={Icon.Calendar}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={openCalendar}
        />
      </MenuBarExtra.Section>
    </>
  );

  if (showInTitle) {
    return (
      <MenuBarExtra icon={Icon.Bell} title={totalStr} isLoading={isLoading}>
        {menuContent}
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon={Icon.Bell} isLoading={isLoading}>
      {menuContent}
    </MenuBarExtra>
  );
}

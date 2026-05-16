import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useState } from "react";
import { AddSubscriptionForm } from "./add-subscription";
import { SubscriptionDetail } from "./subscription-detail";
import { SubscriptionList } from "./subscription-list";
import { useSubscriptions } from "./storage";
import { buildCalendarMarkdown, formatCurrency, getMonthSubscriptions, getMonthlyTotal } from "./utils";

export default function ManageSubscription() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { subscriptions, isLoading } = useSubscriptions();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const monthSubs = getMonthSubscriptions(month, year, subscriptions);
  const monthTotal = getMonthlyTotal(subscriptions, month, year);
  const primaryCurrency = subscriptions[0]?.currency ?? "INR";

  const markdown = buildCalendarMarkdown(year, month, subscriptions);

  function prevMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Subscription Manager"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Monthly Total"
            text={formatCurrency(monthTotal, primaryCurrency)}
            icon={Icon.BankNote}
          />
          <Detail.Metadata.Label title="Subscriptions" text={`${monthSubs.length} this month`} icon={Icon.Calendar} />
          <Detail.Metadata.Separator />
          {monthSubs.length > 0 ? (
            monthSubs.map((sub) => (
              <Detail.Metadata.Label
                key={sub.id}
                title={`${sub.billingDay} ${monthName}`}
                text={`${sub.name} · ${formatCurrency(sub.amount, sub.currency)}`}
                icon={{ source: sub.iconUrl ?? Icon.CreditCard, fallback: Icon.CreditCard }}
              />
            ))
          ) : (
            <Detail.Metadata.Label title="No subscriptions" text="Press ⌘N to add" icon={Icon.Plus} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <Action
              title="Previous Month"
              icon={Icon.ChevronLeft}
              shortcut={{ modifiers: [], key: "arrowLeft" }}
              onAction={prevMonth}
            />
            <Action
              title="Next Month"
              icon={Icon.ChevronRight}
              shortcut={{ modifiers: [], key: "arrowRight" }}
              onAction={nextMonth}
            />
            <Action
              title="Go to Today"
              icon={Icon.Calendar}
              shortcut={{ modifiers: [], key: "t" }}
              onAction={goToToday}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            <Action.Push
              title="Add Subscription"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AddSubscriptionForm />}
            />
            <Action.Push
              title="All Subscriptions"
              icon={Icon.List}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              target={<SubscriptionList />}
            />
          </ActionPanel.Section>

          {monthSubs.length > 0 && (
            <ActionPanel.Section title={`${monthName} ${year}`}>
              {monthSubs.map((sub) => (
                <Action.Push
                  key={sub.id}
                  title={`${sub.billingDay} ${monthName} — ${sub.name}`}
                  icon={{ source: sub.iconUrl ?? Icon.CreditCard, fallback: Icon.CreditCard }}
                  target={<SubscriptionDetail id={sub.id} />}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}

import { Action, ActionPanel, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useState } from "react";
import { AddSubscriptionForm } from "./add-subscription";
import { SubscriptionDetail } from "./subscription-detail";
import { useSubscriptions } from "./storage";
import { CATEGORIES, formatCurrency } from "./utils";

type SortKey = "name" | "amount" | "billingDay" | "category";

export function SubscriptionList() {
  const { subscriptions, deleteSubscription, updateSubscription, isLoading } = useSubscriptions();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("billingDay");

  const filtered = subscriptions
    .filter((s) => selectedCategory === "all" || s.category === selectedCategory)
    .sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "amount":
          return b.amount - a.amount;
        case "billingDay":
          return a.billingDay - b.billingDay;
        case "category":
          return a.category.localeCompare(b.category);
      }
    });

  const active = filtered.filter((s) => s.isActive);
  const paused = filtered.filter((s) => !s.isActive);

  function renderSection(items: typeof filtered, title: string) {
    if (items.length === 0) return null;
    return (
      <List.Section title={title} subtitle={`${items.length} subscription${items.length !== 1 ? "s" : ""}`}>
        {items.map((sub) => (
          <List.Item
            key={sub.id}
            icon={{ source: sub.iconUrl ?? Icon.CreditCard, fallback: Icon.CreditCard }}
            title={sub.name}
            subtitle={sub.category}
            accessories={[
              { text: formatCurrency(sub.amount, sub.currency), tooltip: `${sub.billingCycle}` },
              { text: `Day ${sub.billingDay}`, tooltip: "Billing day" },
              {
                icon: sub.isActive ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle,
                tooltip: sub.isActive ? "Active" : "Paused",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Eye} target={<SubscriptionDetail id={sub.id} />} />
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={<SubscriptionDetail id={sub.id} startEditing />}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <ActionPanel.Section>
                  <Action
                    title={sub.isActive ? "Pause" : "Resume"}
                    icon={sub.isActive ? Icon.Pause : Icon.Play}
                    onAction={async () => {
                      await updateSubscription(sub.id, { isActive: !sub.isActive });
                      await showToast({
                        style: Toast.Style.Success,
                        title: sub.isActive ? `Paused ${sub.name}` : `Resumed ${sub.name}`,
                      });
                    }}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: `Delete "${sub.name}"?`,
                        message: "This action cannot be undone.",
                        primaryAction: { title: "Delete", style: Action.Style.Destructive },
                      });
                      if (confirmed) {
                        await deleteSubscription(sub.id);
                        await showToast({ style: Toast.Style.Success, title: "Subscription Deleted" });
                      }
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Sort By">
                  <Action title="Sort by Billing Day" onAction={() => setSortKey("billingDay")} />
                  <Action title="Sort by Name" onAction={() => setSortKey("name")} />
                  <Action title="Sort by Amount" onAction={() => setSortKey("amount")} />
                  <Action title="Sort by Category" onAction={() => setSortKey("category")} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Add Subscription"
                    icon={Icon.Plus}
                    target={<AddSubscriptionForm />}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  return (
    <List
      navigationTitle="All Subscriptions"
      isLoading={isLoading}
      searchBarPlaceholder="Search subscriptions…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" onChange={setSelectedCategory}>
          <List.Dropdown.Item value="all" title="All Categories" />
          {CATEGORIES.map((cat) => (
            <List.Dropdown.Item key={cat} value={cat} title={cat} />
          ))}
        </List.Dropdown>
      }
    >
      {filtered.length === 0 ? (
        <List.EmptyView
          icon={Icon.CreditCard}
          title="No Subscriptions"
          description="Press Cmd+N to add your first subscription"
          actions={
            <ActionPanel>
              <Action.Push title="Add Subscription" icon={Icon.Plus} target={<AddSubscriptionForm />} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {renderSection(active, "Active")}
          {renderSection(paused, "Paused")}
        </>
      )}
    </List>
  );
}

import { Action, ActionPanel, Detail, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useSubscriptions } from "./storage";
import { BillingCycle, Subscription } from "./types";
import { CATEGORIES, CURRENCIES, LISTS, PRESET_PAYMENT_METHODS, formatCurrency } from "./utils";

interface EditFormValues {
  name: string;
  amount: string;
  currency: string;
  billingCycle: string;
  startDate: Date;
  category: string;
  customPaymentMethod: string;
  list: string;
  iconUrl: string;
  color: string;
  notes: string;
}

function EditForm({ sub, onSave }: { sub: Subscription; onSave: (updates: Partial<Subscription>) => Promise<void> }) {
  const { pop } = useNavigation();
  const isPreset = PRESET_PAYMENT_METHODS.some((p) => p.value === sub.paymentMethod);
  const [paymentSelection, setPaymentSelection] = useState(isPreset ? (sub.paymentMethod ?? PRESET_PAYMENT_METHODS[0].value) : "__custom__");

  async function handleSubmit(values: EditFormValues) {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount" });
      return;
    }

    const paymentMethod =
      paymentSelection === "__custom__" ? values.customPaymentMethod?.trim() || undefined : paymentSelection;

    await onSave({
      name: values.name.trim(),
      amount,
      currency: values.currency,
      billingCycle: values.billingCycle as BillingCycle,
      billingDay: values.startDate.getDate(),
      startDate: values.startDate.toISOString().split("T")[0],
      category: values.category,
      paymentMethod,
      list: values.list,
      iconUrl: values.iconUrl || undefined,
      color: values.color || undefined,
      notes: values.notes || undefined,
    });

    await showToast({ style: Toast.Style.Success, title: "Subscription Updated" });
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit ${sub.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Service Name" defaultValue={sub.name} />
      <Form.Separator />
      <Form.TextField id="amount" title="Amount" defaultValue={String(sub.amount)} />
      <Form.Dropdown id="currency" title="Currency" defaultValue={sub.currency}>
        {CURRENCIES.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.title} icon={c.flag} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown id="billingCycle" title="Billing Cycle" defaultValue={sub.billingCycle}>
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
        <Form.Dropdown.Item value="quarterly" title="Quarterly" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
      </Form.Dropdown>
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        defaultValue={new Date(sub.startDate)}
        type={Form.DatePicker.Type.Date}
      />
      <Form.Separator />
      <Form.Dropdown id="category" title="Category" defaultValue={sub.category}>
        {CATEGORIES.map((cat) => (
          <Form.Dropdown.Item key={cat} value={cat} title={cat} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="paymentSelection" title="Pay With" value={paymentSelection} onChange={setPaymentSelection}>
        {PRESET_PAYMENT_METHODS.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.title} icon={p.icon} />
        ))}
        <Form.Dropdown.Item value="__custom__" title="Other…" icon={Icon.Pencil} />
      </Form.Dropdown>
      {paymentSelection === "__custom__" && (
        <Form.TextField
          id="customPaymentMethod"
          title="Custom Payment Method"
          defaultValue={isPreset ? "" : (sub.paymentMethod ?? "")}
          placeholder="e.g. PayPal, Google Pay, Wallet…"
        />
      )}
      <Form.Dropdown id="list" title="List" defaultValue={sub.list}>
        {LISTS.map((l) => (
          <Form.Dropdown.Item key={l} value={l} title={l} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="iconUrl" title="Icon URL" defaultValue={sub.iconUrl ?? ""} />
      <Form.TextField id="color" title="Brand Color" defaultValue={sub.color ?? ""} />
      <Form.TextArea id="notes" title="Notes" defaultValue={sub.notes ?? ""} />
    </Form>
  );
}

export function SubscriptionDetail({ id, startEditing = false }: { id: string; startEditing?: boolean }) {
  const [editing, setEditing] = useState(startEditing);
  const { subscriptions, updateSubscription, deleteSubscription } = useSubscriptions();
  const { pop } = useNavigation();

  const sub = subscriptions.find((s) => s.id === id);

  if (!sub) {
    return <Detail markdown="## Subscription not found\n\nThis subscription may have been deleted." />;
  }

  if (editing) {
    return (
      <EditForm
        sub={sub}
        onSave={async (updates) => {
          await updateSubscription(id, updates);
          setEditing(false);
        }}
      />
    );
  }

  const nextBilling = (() => {
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth(), sub.billingDay);
    if (next <= today) next.setMonth(next.getMonth() + 1);
    return next.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  })();

  const markdown = `
# ${sub.name}

| Field | Value |
|---|---|
| Amount | **${formatCurrency(sub.amount, sub.currency)}** / ${sub.billingCycle} |
| Next Billing | ${nextBilling} (day ${sub.billingDay}) |
| Category | ${sub.category} |
| List | ${sub.list} |
| Status | ${sub.isActive ? "Active" : "Paused"} |
| Started | ${new Date(sub.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} |
${sub.paymentMethod ? `| Payment Method | ${sub.paymentMethod} |` : ""}

${sub.notes ? `---\n\n${sub.notes}` : ""}
`.trim();

  return (
    <Detail
      navigationTitle={sub.name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Amount" text={formatCurrency(sub.amount, sub.currency)} />
          <Detail.Metadata.Label title="Cycle" text={sub.billingCycle} />
          <Detail.Metadata.Label title="Next Billing" text={nextBilling} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Category" text={sub.category} />
          <Detail.Metadata.Label title="List" text={sub.list} />
          {sub.paymentMethod && <Detail.Metadata.Label title="Paid With" text={sub.paymentMethod} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Status" text={sub.isActive ? "Active" : "Paused"} icon={sub.isActive ? Icon.CheckCircle : Icon.Circle} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Edit" icon={Icon.Pencil} onAction={() => setEditing(true)} shortcut={{ modifiers: ["cmd"], key: "e" }} />
          <Action
            title={sub.isActive ? "Pause Subscription" : "Resume Subscription"}
            icon={sub.isActive ? Icon.Pause : Icon.Play}
            onAction={async () => {
              await updateSubscription(id, { isActive: !sub.isActive });
              await showToast({
                style: Toast.Style.Success,
                title: sub.isActive ? "Subscription Paused" : "Subscription Resumed",
              });
            }}
          />
          <Action
            title="Delete Subscription"
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
                await deleteSubscription(id);
                await showToast({ style: Toast.Style.Success, title: "Subscription Deleted" });
                pop();
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}

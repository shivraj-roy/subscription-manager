import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useSubscriptions } from "./storage";
import { BillingCycle, Subscription } from "./types";
import { CATEGORIES, CURRENCIES, LISTS, PRESET_PAYMENT_METHODS, generateId, getFaviconUrl } from "./utils";

interface FormValues {
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

export function AddSubscriptionForm({ defaultBillingDay: _defaultBillingDay }: { defaultBillingDay?: number } = {}) {
  const { addSubscription } = useSubscriptions();
  const { pop } = useNavigation();
  const [paymentSelection, setPaymentSelection] = useState(PRESET_PAYMENT_METHODS[0].value);

  async function handleSubmit(values: FormValues) {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount", message: "Enter a valid positive number" });
      return;
    }

    const paymentMethod =
      paymentSelection === "__custom__" ? values.customPaymentMethod?.trim() || undefined : paymentSelection;

    const iconUrl = values.iconUrl || getFaviconUrl(values.name);

    const sub: Subscription = {
      id: generateId(),
      name: values.name.trim(),
      billingDay: values.startDate.getDate(),
      startDate: values.startDate.toISOString().split("T")[0],
      amount,
      currency: values.currency,
      billingCycle: values.billingCycle as BillingCycle,
      category: values.category,
      paymentMethod,
      list: values.list,
      iconUrl,
      color: values.color || undefined,
      notes: values.notes || undefined,
      isActive: true,
    };

    await addSubscription(sub);
    await showToast({ style: Toast.Style.Success, title: "Subscription Added", message: sub.name });
    pop();
  }

  return (
    <Form
      navigationTitle="Add Subscription"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Subscription" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Service Name" placeholder="Netflix, Spotify, GitHub…" autoFocus />

      <Form.Separator />

      <Form.TextField id="amount" title="Amount" placeholder="9.99" />
      <Form.Dropdown id="currency" title="Currency" defaultValue="INR">
        {CURRENCIES.map((c) => (
          <Form.Dropdown.Item key={c.value} value={c.value} title={c.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown id="billingCycle" title="Billing Cycle" defaultValue="monthly">
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
        <Form.Dropdown.Item value="quarterly" title="Quarterly (every 3 months)" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
      </Form.Dropdown>
      <Form.DatePicker id="startDate" title="Start Date" defaultValue={new Date()} type={Form.DatePicker.Type.Date} />

      <Form.Separator />

      <Form.Dropdown id="category" title="Category" defaultValue="Entertainment">
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
        <Form.TextField id="customPaymentMethod" title="Custom Payment Method" placeholder="e.g. PayPal, Google Pay, Wallet…" />
      )}
      <Form.Dropdown id="list" title="List" defaultValue="Personal">
        {LISTS.map((l) => (
          <Form.Dropdown.Item key={l} value={l} title={l} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField id="iconUrl" title="Icon URL" placeholder="Leave empty to auto-detect favicon" />
      <Form.TextField id="color" title="Brand Color" placeholder="#1DB954 (optional)" />
      <Form.TextArea id="notes" title="Notes" placeholder="Any additional notes…" />
    </Form>
  );
}

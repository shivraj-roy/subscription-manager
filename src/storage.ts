import { useLocalStorage } from "@raycast/utils";
import { Subscription } from "./types";

const STORAGE_KEY = "subscriptions-v1";

export function useSubscriptions() {
  const { value, setValue, isLoading } = useLocalStorage<Subscription[]>(STORAGE_KEY, []);
  const subscriptions = value ?? [];

  async function addSubscription(sub: Subscription) {
    await setValue([...subscriptions, sub]);
  }

  async function updateSubscription(id: string, updates: Partial<Subscription>) {
    await setValue(subscriptions.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  async function deleteSubscription(id: string) {
    await setValue(subscriptions.filter((s) => s.id !== id));
  }

  return { subscriptions, addSubscription, updateSubscription, deleteSubscription, isLoading };
}

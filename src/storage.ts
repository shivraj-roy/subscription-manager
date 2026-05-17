import { LocalStorage } from "@raycast/api";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Subscription, SubscriptionStatus } from "./types";

const STORAGE_KEY = "subscriptions-v1";

// Migrate old isActive boolean → status field
function migrate(raw: Record<string, unknown>[]): Subscription[] {
  return raw.map((s) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isActive: _removed, ...rest } = s;
    const rawStatus = s.status as string | undefined;
    const status: SubscriptionStatus =
      rawStatus === "active" || rawStatus === "paused"
        ? rawStatus
        : ((s.isActive as boolean) ?? true)
          ? "active"
          : "paused";
    return { ...rest, status } as Subscription;
  });
}

let _cache: Subscription[] | null = null;
const _setters = new Set<Dispatch<SetStateAction<Subscription[]>>>();

function notify() {
  _setters.forEach((set) => set([...(_cache ?? [])]));
}

async function persist(subs: Subscription[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(_cache ?? []);
  const [isLoading, setIsLoading] = useState(_cache === null);

  useEffect(() => {
    _setters.add(setSubscriptions);

    if (_cache === null) {
      LocalStorage.getItem<string>(STORAGE_KEY).then((raw) => {
        _cache = raw ? migrate(JSON.parse(raw) as Record<string, unknown>[]) : [];
        setIsLoading(false);
        notify();
      });
    } else {
      setIsLoading(false);
      // Sync with latest cache on mount (covers remount after navigation)
      setSubscriptions([..._cache]);
    }

    return () => {
      _setters.delete(setSubscriptions);
    };
  }, []);

  async function addSubscription(sub: Subscription) {
    _cache = [...(_cache ?? []), sub];
    notify();
    await persist(_cache);
  }

  async function updateSubscription(id: string, updates: Partial<Subscription>) {
    _cache = (_cache ?? []).map((s) => (s.id === id ? { ...s, ...updates } : s));
    notify();
    await persist(_cache);
  }

  async function deleteSubscription(id: string) {
    _cache = (_cache ?? []).filter((s) => s.id !== id);
    notify();
    await persist(_cache);
  }

  return { subscriptions, addSubscription, updateSubscription, deleteSubscription, isLoading };
}

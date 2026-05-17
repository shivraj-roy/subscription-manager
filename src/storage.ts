import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { Subscription } from "./types";

const STORAGE_KEY = "subscriptions-v1";

// Module-level cache shared across ALL hook instances regardless of navigation tree.
// When any component mutates, notify() re-renders every subscriber instantly.
let _cache: Subscription[] | null = null;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

async function persist(subs: Subscription[]) {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

export function useSubscriptions() {
  const [, forceUpdate] = useState(0);
  const [isLoading, setIsLoading] = useState(_cache === null);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.add(listener);

    if (_cache === null) {
      LocalStorage.getItem<string>(STORAGE_KEY).then((raw) => {
        _cache = raw ? (JSON.parse(raw) as Subscription[]) : [];
        setIsLoading(false);
        notify();
      });
    } else {
      setIsLoading(false);
    }

    return () => {
      _listeners.delete(listener);
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

  return { subscriptions: _cache ?? [], addSubscription, updateSubscription, deleteSubscription, isLoading };
}

/**
 * Keeps one value that lives in localStorage, shared by every component on
 * the page. Components read it with useSyncExternalStore(store.subscribe,
 * store.getSnapshot, store.getServerSnapshot) and change it with update().
 * Changes saved by other tabs are picked up too.
 *
 * `T` stands for the type of the value, so the same code works for the
 * transactions and for the settings.
 */
export function createStorageStore<T>({
  key,
  load,
  save,
}: {
  /** The localStorage key, used to notice changes made in other tabs. */
  key: string;
  load: () => T;
  /** Returns false if the browser refused to save. */
  save: (value: T) => boolean;
}) {
  // undefined until the first time a component asks for the value.
  let current: T | undefined;
  const listeners = new Set<() => void>();

  function getSnapshot(): T {
    if (current === undefined) current = load();
    return current;
  }

  // The server has no access to the browser's storage, so it renders a
  // "not loaded yet" state and the browser fills in the real value.
  function getServerSnapshot(): null {
    return null;
  }

  function notifyListeners() {
    for (const listener of listeners) listener();
  }

  // Another tab saved a change: reload it, so this tab doesn't overwrite it.
  // (event.key is null when all storage was cleared.)
  function handleStorageEvent(event: StorageEvent) {
    if (event.key === key || event.key === null) {
      current = load();
      notifyListeners();
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
      window.addEventListener("storage", handleStorageEvent);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        window.removeEventListener("storage", handleStorageEvent);
      }
    };
  }

  /**
   * Changes the value and saves it. The change shows on screen even if
   * saving fails; the return value says whether it was saved.
   */
  function update(change: (previous: T) => T): boolean {
    current = change(getSnapshot());
    notifyListeners();
    return save(current);
  }

  return { subscribe, getSnapshot, getServerSnapshot, update };
}

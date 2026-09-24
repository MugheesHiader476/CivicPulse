import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, Info, X } from "lucide-react";
import { ToastContext, type Toast, type ToastTone } from "../lib/toast";

const ICONS = { success: CircleCheck, info: Info, error: CircleX } as const;
const LIFETIME_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, tone, message }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), LIFETIME_MS));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <div key={toast.id} className="toast" data-tone={toast.tone}>
              <Icon size={20} aria-hidden="true" />
              <span>{toast.message}</span>
              <button type="button" className="icon-btn" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

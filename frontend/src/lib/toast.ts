import { createContext, useContext } from "react";

export type ToastTone = "success" | "info" | "error";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

export type PushToast = (message: string, tone?: ToastTone) => void;

export const ToastContext = createContext<PushToast>(() => {});

export function useToast(): PushToast {
  return useContext(ToastContext);
}

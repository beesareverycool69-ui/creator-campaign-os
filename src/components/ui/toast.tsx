"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  toast: (toast: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...input, id }]);
      window.setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (title, description) => toast({ type: "success", title, description }),
      error: (title, description) => toast({ type: "error", title, description }),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border bg-background p-4 shadow-lg ${
              toast.type === "success"
                ? "border-green-500/30"
                : toast.type === "error"
                  ? "border-destructive/30"
                  : "border-border"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 h-2 w-2 rounded-full ${
                  toast.type === "success"
                    ? "bg-green-500"
                    : toast.type === "error"
                      ? "bg-destructive"
                      : "bg-primary"
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

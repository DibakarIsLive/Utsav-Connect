"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/ui/lib/cn";
import { Button } from "@/ui/components/ui/Button";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

/**
 * Accessible modal: focus moves into the dialog, Escape closes it, Tab is
 * trapped, focus is restored on close, and background scrolling is locked.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Close dialog",
  bodyClassName = "",
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);
  const previousFocus = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        "[data-autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href]",
      );
      focusable?.focus();
    }, 30);

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, [open, close]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-bark-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-ivory shadow-[0_40px_120px_-30px_rgba(0,0,0,0.55)] sm:rounded-[1.75rem]",
              SIZES[size] ?? SIZES.md,
            )}
            initial={reduce ? false : { opacity: 0, y: 26, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7 sm:py-5">
              <div>
                {title ? (
                  <h2 id={titleId} className="text-bark-900 text-xl font-semibold tracking-[-0.02em]">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p id={descriptionId} className="text-ink-500 mt-1 max-w-xl text-sm leading-relaxed">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={closeLabel}
                className="text-ink-400 hover:bg-bark-50 hover:text-bark-900 -mr-1 rounded-full p-2 transition-colors"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none">
                  <path
                    d="m5 5 10 10M15 5 5 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className={cn("overflow-y-auto px-5 py-5 sm:px-7 sm:py-6", bodyClassName)}>
              {children}
            </div>
            {footer ? (
              <div className="border-line flex flex-wrap items-center justify-end gap-2.5 border-t bg-white/60 px-5 py-4 sm:px-7">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Confirmation dialog for sensitive actions. The confirm button can be
 * destructive or ordinary, and stays disabled while the request is running.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  destructive = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

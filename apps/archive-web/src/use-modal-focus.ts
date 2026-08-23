import { useEffect, type RefObject } from "react";

const focusableSelector = [
  "button:not(:disabled)",
  "a[href]",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface ModalFocusOptions {
  readonly escapeEnabled?: boolean;
  readonly returnFocus?: RefObject<HTMLElement | null>;
}

export function shouldDismissModalForKey(key: string, escapeEnabled: boolean): boolean {
  return key === "Escape" && escapeEnabled;
}

export function useModalFocus(
  dialog: RefObject<HTMLElement | null>,
  initialFocus: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: ModalFocusOptions = {},
) {
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusOnClose = options.returnFocus?.current;
    initialFocus.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (shouldDismissModalForKey(event.key, options.escapeEnabled ?? true)) onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("aria-hidden"),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (focusOnClose) {
        focusOnClose.focus();
      } else {
        previouslyFocused?.focus();
      }
    };
  }, [dialog, initialFocus, onClose, options.escapeEnabled, options.returnFocus]);
}

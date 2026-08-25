import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

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

interface FocusTarget {
  focus(): void;
}

interface ModalFocusRegistration {
  readonly element: HTMLElement;
}

const modalFocusStacks = new WeakMap<Document, ModalFocusRegistration[]>();

function registerModalFocus(element: HTMLElement): {
  isTop: () => boolean;
  unregister: () => boolean;
} {
  const ownerDocument = element.ownerDocument;
  const stack = modalFocusStacks.get(ownerDocument) ?? [];
  if (stack.length === 0) modalFocusStacks.set(ownerDocument, stack);
  const registration = { element };
  stack.push(registration);
  return {
    isTop: () => stack.at(-1) === registration,
    unregister: () => {
      const wasTop = stack.at(-1) === registration;
      const index = stack.indexOf(registration);
      if (index >= 0) stack.splice(index, 1);
      if (stack.length === 0) modalFocusStacks.delete(ownerDocument);
      return wasTop;
    },
  };
}

export function updateModalCloseHandler(handlerRef: { current: () => void }, onClose: () => void): void {
  handlerRef.current = onClose;
}

export function restoreModalFocus(preferred: FocusTarget | null, previous: FocusTarget | null): void {
  (preferred ?? previous)?.focus();
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
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    updateModalCloseHandler(onCloseRef, onClose);
  }, [onClose]);
  const escapeEnabled = options.escapeEnabled ?? true;
  const returnFocus = options.returnFocus;

  useEffect(() => {
    const modalElement = dialog.current;
    if (!modalElement) return;
    const ownerDocument = modalElement.ownerDocument;
    const focusRegistration = registerModalFocus(modalElement);
    const previouslyFocused =
      ownerDocument.activeElement instanceof HTMLElement ? ownerDocument.activeElement : null;
    const focusOnClose = returnFocus?.current;
    initialFocus.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!focusRegistration.isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (shouldDismissModalForKey(event.key, escapeEnabled)) onCloseRef.current();
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
      const active = ownerDocument.activeElement;
      if (event.shiftKey && (active === first || !dialog.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    ownerDocument.addEventListener("keydown", handleKeyDown);
    return () => {
      ownerDocument.removeEventListener("keydown", handleKeyDown);
      if (focusRegistration.unregister()) restoreModalFocus(focusOnClose ?? null, previouslyFocused);
    };
  }, [dialog, escapeEnabled, initialFocus, returnFocus]);
}

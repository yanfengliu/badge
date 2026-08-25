import { useLayoutEffect, type RefObject } from "react";

interface ModalRegistration {
  readonly element: HTMLElement;
}

interface AttributeSnapshot {
  readonly element: HTMLElement;
  readonly inert: string | null;
}

interface ModalDocumentState {
  readonly registrations: ModalRegistration[];
  readonly inertSnapshots: Map<HTMLElement, AttributeSnapshot>;
  readonly documentElementStyle: string | null;
  readonly bodyStyle: string | null;
}

const documentStates = new WeakMap<Document, ModalDocumentState>();

function restoreAttribute(element: HTMLElement, name: string, value: string | null): void {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

function restoreInertState(state: ModalDocumentState): void {
  for (const snapshot of state.inertSnapshots.values()) {
    restoreAttribute(snapshot.element, "inert", snapshot.inert);
  }
}

function rememberAndInert(state: ModalDocumentState, element: HTMLElement): void {
  if (!state.inertSnapshots.has(element)) {
    state.inertSnapshots.set(element, { element, inert: element.getAttribute("inert") });
  }
  if (!element.hasAttribute("inert")) element.setAttribute("inert", "");
}

function isolateTopModal(state: ModalDocumentState): void {
  restoreInertState(state);
  const top = state.registrations.at(-1)?.element;
  if (!top?.isConnected) return;

  let branch: HTMLElement = top;
  while (branch !== branch.ownerDocument.body) {
    const parent = branch.parentElement;
    if (!parent) break;
    for (const sibling of parent.children) {
      if (sibling !== branch && sibling instanceof HTMLElement) rememberAndInert(state, sibling);
    }
    branch = parent;
  }
}

function beginDocumentIsolation(element: HTMLElement): ModalDocumentState {
  const ownerDocument = element.ownerDocument;
  const existing = documentStates.get(ownerDocument);
  if (existing) return existing;

  const state: ModalDocumentState = {
    registrations: [],
    inertSnapshots: new Map(),
    documentElementStyle: ownerDocument.documentElement.getAttribute("style"),
    bodyStyle: ownerDocument.body.getAttribute("style"),
  };
  documentStates.set(ownerDocument, state);
  ownerDocument.documentElement.style.overflow = "hidden";
  ownerDocument.body.style.overflow = "hidden";
  return state;
}

function endDocumentIsolation(ownerDocument: Document, state: ModalDocumentState): void {
  restoreInertState(state);
  restoreAttribute(ownerDocument.documentElement, "style", state.documentElementStyle);
  restoreAttribute(ownerDocument.body, "style", state.bodyStyle);
  documentStates.delete(ownerDocument);
}

export function registerModalEnvironment(element: HTMLElement): () => void {
  const ownerDocument = element.ownerDocument;
  const state = beginDocumentIsolation(element);
  const registration = { element };
  state.registrations.push(registration);
  isolateTopModal(state);

  return () => {
    const index = state.registrations.indexOf(registration);
    if (index >= 0) state.registrations.splice(index, 1);
    if (state.registrations.length === 0) endDocumentIsolation(ownerDocument, state);
    else isolateTopModal(state);
  };
}

export function useModalEnvironment(dialog: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    return registerModalEnvironment(element);
  }, [dialog]);
}

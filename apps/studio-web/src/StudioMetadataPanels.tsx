import { useState, type KeyboardEvent } from "react";
import type { StudioBadgeTarget, StudioQuotationChoice } from "@badge/studio-adjustment-contract";

export function StudioTagsPanel({
  tags,
  disabled,
  problem,
  onAdd,
  onRemove,
}: {
  readonly tags: readonly string[];
  readonly disabled: boolean;
  readonly problem: string | null;
  readonly onAdd: (tag: string) => void;
  readonly onRemove: (tag: string) => void;
}) {
  const [entry, setEntry] = useState("");

  function commit() {
    const trimmed = entry.trim();
    if (trimmed.length === 0) return;
    onAdd(trimmed);
    setEntry("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") return;
    event.preventDefault();
    commit();
  }

  return (
    <section className="studio-panel" aria-labelledby="studio-tags-heading">
      <h3 id="studio-tags-heading">Tags</h3>
      <p className="studio-panel__hint">
        Your own words for finding this badge later. They stay on this device.
      </p>
      <ul className="studio-tags" aria-label="Tags on this badge">
        {tags.map((tag) => (
          <li key={tag}>
            <span>{tag}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove tag ${tag}`}
              onClick={() => onRemove(tag)}
            >
              ×
            </button>
          </li>
        ))}
        {tags.length === 0 ? <li className="studio-tags__empty">No tags yet.</li> : null}
      </ul>
      <div className="studio-tag-entry">
        <label>
          <span>Add a tag</span>
          <input
            type="text"
            value={entry}
            disabled={disabled}
            placeholder="granite, with dad, rainy"
            onChange={(event) => setEntry(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </label>
        <button type="button" disabled={disabled || entry.trim().length === 0} onClick={commit}>
          Add
        </button>
      </div>
      {problem ? (
        <p className="studio-panel__problem" role="status">
          {problem}
        </p>
      ) : null}
    </section>
  );
}

export function StudioQuotePanel({
  quotations,
  selectedQuotationId,
  sealed,
  disabled,
  onSelect,
}: {
  readonly quotations: readonly StudioQuotationChoice[];
  readonly selectedQuotationId: string | null;
  readonly sealed: boolean;
  readonly disabled: boolean;
  readonly onSelect: (quotationId: string) => void;
}) {
  return (
    <section className="studio-panel" aria-labelledby="studio-quote-heading">
      <h3 id="studio-quote-heading">Quote</h3>
      <p className="studio-panel__hint">
        {sealed
          ? "This memory is collected, so its quote is sealed with it."
          : "Each badge carries two source-checked historical quotations. Choose the one you want."}
      </p>
      <div className="studio-quote-choices" role="radiogroup" aria-labelledby="studio-quote-heading">
        {quotations.map((quotation) => (
          <button
            key={quotation.quotationId}
            type="button"
            role="radio"
            className="studio-quote"
            aria-checked={quotation.quotationId === selectedQuotationId}
            disabled={disabled || sealed}
            onClick={() => onSelect(quotation.quotationId)}
          >
            <q>{quotation.text}</q>
            <small>
              {quotation.person} · {quotation.sourceTitle}
            </small>
          </button>
        ))}
        {quotations.length === 0 ? (
          <p className="studio-panel__problem">
            This badge has no quotation bank on this device; reopen it from Discover after the archive
            finishes loading.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function StudioCollectionsPanel({
  target,
  selectedKeys,
  disabled,
  onToggle,
}: {
  readonly target: StudioBadgeTarget;
  readonly selectedKeys: readonly string[];
  readonly disabled: boolean;
  readonly onToggle: (key: string) => void;
}) {
  const onlyOneLeft = selectedKeys.length === 1;
  return (
    <section className="studio-panel" aria-labelledby="studio-collections-heading">
      <h3 id="studio-collections-heading">Collections</h3>
      <p className="studio-panel__hint">
        Every badge belongs to at least one collection, so the last one cannot be removed.
      </p>
      <ul className="studio-collections">
        {target.collections.map((option) => {
          const checked = selectedKeys.includes(option.key);
          return (
            <li key={option.key}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || (checked && onlyOneLeft)}
                  onChange={() => onToggle(option.key)}
                />
                <span>{option.label}</span>
                {option.fromCatalogue ? <em>From the catalogue</em> : null}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

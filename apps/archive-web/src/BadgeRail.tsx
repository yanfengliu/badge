import type { ArchiveState } from "@badge/archive-domain";
import { starterBadges } from "@badge/catalogue-fixtures/archive";

interface BadgeRailProps {
  state: ArchiveState;
  selectedRecordId: string;
  earnedSourceUrls: Readonly<Record<string, string>>;
  onSelect: (recordId: string) => void;
}

export function BadgeRail({ state, selectedRecordId, earnedSourceUrls, onSelect }: BadgeRailProps) {
  return (
    <div className="badge-rail" aria-label="Choose a badge">
      {starterBadges.map((badge) => {
        const record = state.records.find((item) => item.recordId === `starter:${badge.definitionId}`);
        if (!record) return null;
        const thumbnailSource =
          record.lifecycle === "earned" ? earnedSourceUrls[record.recordId] : badge.sourceUrl;
        return (
          <button
            key={record.recordId}
            className="badge-thumb"
            type="button"
            aria-current={record.recordId === selectedRecordId}
            onClick={() => onSelect(record.recordId)}
          >
            <span
              className="thumb-art"
              style={thumbnailSource ? { backgroundImage: `url(${thumbnailSource})` } : undefined}
            />
            <span className="thumb-copy">
              <strong>{record.title}</strong>
              <span>{record.lifecycle}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

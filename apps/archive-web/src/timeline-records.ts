import type { ActivationRecord, ArchiveRecord, ArchiveState } from "@badge/archive-domain";

export type EarnedTimelineRecord = ArchiveRecord & {
  readonly lifecycle: "earned";
  readonly activation: ActivationRecord;
};

function isEarnedTimelineRecord(record: ArchiveRecord): record is EarnedTimelineRecord {
  return record.lifecycle === "earned" && record.activation !== null;
}

export function orderedTimelineRecords(state: ArchiveState): EarnedTimelineRecord[] {
  return state.records
    .filter(isEarnedTimelineRecord)
    .sort(
      (left, right) =>
        right.activation.occurredEnd.localeCompare(left.activation.occurredEnd) ||
        right.activation.occurredStart.localeCompare(left.activation.occurredStart) ||
        Date.parse(right.activation.activatedAt) - Date.parse(left.activation.activatedAt) ||
        left.recordId.localeCompare(right.recordId),
    );
}

export function toggledTimelineInspection(
  currentRecordId: string | null,
  requestedRecordId: string,
): string | null {
  return currentRecordId === requestedRecordId ? null : requestedRecordId;
}

export interface ArchiveNoticeState {
  readonly kind: "info" | "error";
  readonly text: string;
}

interface ArchiveNoticeProps {
  readonly notice: ArchiveNoticeState | null;
  readonly onDismiss: () => void;
}

export function ArchiveNotice({ notice, onDismiss }: ArchiveNoticeProps) {
  if (!notice) return null;
  return (
    <div
      className={`notice${notice.kind === "error" ? " error" : ""}`}
      role={notice.kind === "error" ? "alert" : "status"}
      onClick={onDismiss}
    >
      {notice.text}
    </div>
  );
}

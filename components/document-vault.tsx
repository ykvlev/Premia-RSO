"use client";

const F = "var(--font-onest), sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type Attachment = {
  id: string;
  filename: string;
  url: string;
  mime?: string;
  size?: number;
};

function formatSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx"].includes(ext)) return "📊";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
  if (["zip", "rar", "7z"].includes(ext)) return "📦";
  if (["mp4", "avi", "mov"].includes(ext)) return "🎬";
  return "📎";
}

export function DocumentVault({ attachments }: { attachments: Attachment[] }) {
  if (!attachments || attachments.length === 0) {
    return (
      <div
        style={{
          padding: "24px 16px",
          textAlign: "center",
          color: "var(--cab-faint)",
          fontSize: 13,
          fontFamily: F,
        }}
      >
        <span style={{ fontSize: 24, display: "block", marginBottom: 8, opacity: 0.4 }}>📎</span>
        Документы не загружены
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {attachments.map((att) => {
        const icon = getFileIcon(att.filename);
        return (
          <a
            key={att.id}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "var(--cab-surface2)",
              border: "1px solid var(--cab-border)",
              borderRadius: 8,
              textDecoration: "none",
              transition: "border-color 0.15s",
              cursor: "pointer",
            }}
            className="hover-card"
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: "var(--cab-text)",
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: F,
                }}
              >
                {att.filename}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                {att.size ? (
                  <span style={{ color: "var(--cab-faint)", fontSize: 11, fontFamily: MONO }}>
                    {formatSize(att.size)}
                  </span>
                ) : null}
                {att.mime && (
                  <span style={{ color: "var(--cab-faint)", fontSize: 11, fontFamily: MONO }}>
                    {att.mime.split("/").pop()}
                  </span>
                )}
              </div>
            </div>
            <span
              style={{
                color: "var(--cab-accent, #0804ff)",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              ↗
            </span>
          </a>
        );
      })}
    </div>
  );
}

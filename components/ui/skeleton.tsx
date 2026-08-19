"use client";

export function SkeletonLine({ width = "100%", height = 16, style }: { width?: string | number; height?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton"
      style={{
        width,
        height,
        borderRadius: 6,
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton-card"
      style={{
        background: "#121216",
        border: "1px solid #2a2a32",
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        ...style,
      }}
    >
      <SkeletonLine width="60%" height={18} />
      <SkeletonLine width="40%" height={14} />
      <SkeletonLine width="100%" height={14} style={{ marginTop: 8 }} />
      <SkeletonLine width="80%" height={14} />
    </div>
  );
}

export function SkeletonAvatar({ size = 48, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="skeleton"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

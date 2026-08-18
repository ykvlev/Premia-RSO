/** Скелетон загрузки для тяжёлых роутов (показывается во время рендера). */
export function RouteSkeleton() {
  return (
    <main style={{ flex: 1, minHeight: "100vh", background: "#08080a", padding: "24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div className="skel" style={{ height: 30, width: "40%", marginBottom: 12 }} />
        <div className="skel" style={{ height: 16, width: "65%", marginBottom: 32, opacity: 0.7 }} />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="skel"
            style={{ height: 96, width: "100%", marginBottom: 14, borderRadius: 14 }}
          />
        ))}
      </div>
    </main>
  );
}

"use client";

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 11, color: "#1a1a22" },
  header: { borderBottom: "2pt solid #0804ff", paddingBottom: 12, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "bold", color: "#0804ff", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#6a6a72" },
  sectionTitle: {
    fontSize: 12, fontWeight: "bold", color: "#0804ff", marginTop: 16,
    marginBottom: 8, borderBottom: "0.5pt solid #e0e0e0", paddingBottom: 4,
  },
  row: { flexDirection: "row", marginBottom: 6 },
  label: { width: 160, fontSize: 10, color: "#6a6a72" },
  value: { flex: 1, fontSize: 11, color: "#1a1a22", fontWeight: "bold" },
  statusBadge: {
    display: "flex", flexDirection: "row", alignItems: "center",
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4,
    border: "1pt solid #0804ff", alignSelf: "flex-start", marginTop: 8,
  },
  statusText: { fontSize: 11, fontWeight: "bold", color: "#0804ff" },
  timelineRow: { flexDirection: "row", marginBottom: 8, alignItems: "flex-start" },
  timelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#0804ff", marginTop: 4, marginRight: 8 },
  timelineText: { flex: 1, fontSize: 10, color: "#3a3a44", lineHeight: 1.5 },
  commentBox: { background: "#f5f5f8", borderRadius: 4, padding: 10, marginTop: 8 },
  commentText: { fontSize: 10, color: "#3a3a44", lineHeight: 1.6 },
  footer: {
    position: "absolute", bottom: 30, left: 40, right: 40,
    borderTop: "0.5pt solid #e0e0e0", paddingTop: 10,
    flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: "#9a9aa4",
  },
});

const STATUS_MAP: Record<string, string> = {
  new: "Отправлена", queued: "Ожидает рассмотрения", review: "На рассмотрении",
  revision: "Требует доработки", scoring: "На оценке жюри", finalist: "Финалист",
  winner: "Победитель", rejected: "Отклонена",
};

type Props = {
  application: {
    id: string;
    status: string;
    contactFio: string;
    orgName: string;
    email: string;
    phone: string;
    region: string;
    createdAt: string;
    nominationTitle: string;
    expertComment?: string;
    evaluations?: { juryName: string; scores: Record<string, number>; total: number; comment?: string }[];
    events?: { action: string; createdAt: string }[];
  };
};

export function ParticipantProtocol({ application: app }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Протокол оценки заявки</Text>
          <Text style={s.subtitle}>Национальная премия «Труд крут»</Text>
          <Text style={s.subtitle}>Заявка №{app.id.slice(-8)} от {new Date(app.createdAt).toLocaleDateString("ru-RU")}</Text>
        </View>

        <Text style={s.sectionTitle}>Информация о заявителе</Text>
        <View style={s.row}>
          <Text style={s.label}>Номинация:</Text>
          <Text style={s.value}>{app.nominationTitle}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Заявитель:</Text>
          <Text style={s.value}>{app.contactFio}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Организация:</Text>
          <Text style={s.value}>{app.orgName}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Регион:</Text>
          <Text style={s.value}>{app.region}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Email:</Text>
          <Text style={s.value}>{app.email}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Телефон:</Text>
          <Text style={s.value}>{app.phone}</Text>
        </View>

        <View style={s.statusBadge}>
          <Text style={s.statusText}>{STATUS_MAP[app.status] || app.status}</Text>
        </View>

        {app.evaluations && app.evaluations.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Оценки жюри</Text>
            {app.evaluations.map((ev, i) => (
              <View key={i} style={s.commentBox}>
                <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 4 }}>{ev.juryName}</Text>
                {Object.entries(ev.scores).map(([k, v]) => (
                  <View key={k} style={{ flexDirection: "row", marginBottom: 2 }}>
                    <Text style={{ flex: 1, fontSize: 9, color: "#3a3a44" }}>{k}</Text>
                    <Text style={{ fontSize: 9, color: "#0804ff", fontWeight: "bold" }}>{v}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: "row", marginTop: 4, borderTop: "0.5pt solid #e0e0e0", paddingTop: 4 }}>
                  <Text style={{ flex: 1, fontSize: 10, fontWeight: "bold" }}>Итого</Text>
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: "#0804ff" }}>{ev.total}</Text>
                </View>
                {ev.comment && (
                  <Text style={{ ...s.commentText, marginTop: 6, fontStyle: "italic" }}>{ev.comment}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {app.expertComment && (
          <>
            <Text style={s.sectionTitle}>Комментарий эксперта</Text>
            <View style={s.commentBox}>
              <Text style={s.commentText}>{app.expertComment}</Text>
            </View>
          </>
        )}

        {app.events && app.events.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Хронология действий</Text>
            {app.events.map((ev, i) => (
              <View key={i} style={s.timelineRow}>
                <View style={s.timelineDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.timelineText}>{ev.action}</Text>
                  <Text style={{ fontSize: 9, color: "#9a9aa4" }}>
                    {new Date(ev.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={s.footer}>
          <Text>Национальная премия «Труд крут»</Text>
          <Text>Документ сформирован {new Date().toLocaleDateString("ru-RU")}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function ParticipantProtocolLink({ application }: Props) {
  return (
    <PDFDownloadLink
      document={<ParticipantProtocol application={application} />}
      fileName={`protocol-${application.id.slice(-8)}.pdf`}
      style={{
        display: "inline-block",
        background: "#0804ff",
        color: "#fff",
        fontSize: 13,
        fontWeight: 700,
        borderRadius: 999,
        padding: "9px 18px",
        textDecoration: "none",
      }}
    >
      {({ loading }) => (loading ? "Формирование..." : "Скачать протокол")}
    </PDFDownloadLink>
  );
}

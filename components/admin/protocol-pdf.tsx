"use client";

import { useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  PDFViewer,
} from "@react-pdf/renderer";
import type { Application } from "./admin-app";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1a1a22",
  },
  header: {
    borderBottom: "2pt solid #0804ff",
    paddingBottom: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0804ff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6a6a72",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#0804ff",
    marginTop: 16,
    marginBottom: 8,
    borderBottom: "0.5pt solid #e0e0e0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 160,
    fontSize: 10,
    color: "#6a6a72",
  },
  value: {
    flex: 1,
    fontSize: 11,
    color: "#1a1a22",
    fontWeight: "bold",
  },
  scoreRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #eee",
    paddingVertical: 4,
  },
  scoreLabel: {
    flex: 1,
    fontSize: 10,
    color: "#1a1a22",
  },
  scoreMax: {
    width: 50,
    textAlign: "center",
    fontSize: 10,
    color: "#6a6a72",
  },
  scoreValue: {
    width: 50,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "bold",
    color: "#0804ff",
  },
  totalRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1.5pt solid #0804ff",
  },
  totalLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a22",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0804ff",
  },
  commentBox: {
    background: "#f5f5f8",
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  commentText: {
    fontSize: 10,
    color: "#3a3a44",
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "0.5pt solid #e0e0e0",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#9a9aa4",
  },
  signatureLine: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: 200,
    borderTop: "0.5pt solid #1a1a22",
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 9,
    color: "#6a6a72",
  },
});

const STATUS_LABELS: Record<string, string> = {
  new: "Отправлена",
  queued: "Ожидает",
  review: "На рассмотрении",
  revision: "Доработка",
  scoring: "На оценке",
  approved: "Финалист",
  winner: "Победитель",
  rejected: "Отклонена",
};

function ProtocolDocument({ app }: { app: Application }) {
  const fio = [app.nomLastName, app.nomFirstName, app.nomPatronymic]
    .filter(Boolean)
    .join(" ");

  const totalScore = app.scores.reduce((s, c) => s + (c.value ?? 0), 0);
  const maxScore = app.scores.reduce((s, c) => s + c.max, 0);
  const date = new Date(app.submittedAt).toLocaleDateString("ru-RU");

  return (
    <Document
      title={`Протокол оценки ${app.id}`}
      author="Национальная премия «Труд крут»"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Протокол оценки заявки</Text>
          <Text style={styles.subtitle}>
            Национальная премия «Труд крут» · Сезон 2026
          </Text>
        </View>

        {/* Application Info */}
        <View>
          <Text style={styles.sectionTitle}>Информация о заявке</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Регистрационный номер:</Text>
            <Text style={styles.value}>{app.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Дата подачи:</Text>
            <Text style={styles.value}>{date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Статус:</Text>
            <Text style={styles.value}>{STATUS_LABELS[app.status] ?? app.status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Номинация:</Text>
            <Text style={styles.value}>
              {app.nomination} — {app.nominationTitle}
            </Text>
          </View>
        </View>

        {/* Nominee Info */}
        <View>
          <Text style={styles.sectionTitle}>Данные номинанта</Text>
          <View style={styles.row}>
            <Text style={styles.label}>ФИО:</Text>
            <Text style={styles.value}>{fio}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Регион:</Text>
            <Text style={styles.value}>{app.nomRegion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Место работы:</Text>
            <Text style={styles.value}>{app.nomPosition || "—"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Охват деятельности:</Text>
            <Text style={styles.value}>{app.coverageLevel || "—"}</Text>
          </View>
        </View>

        {/* Description */}
        <View>
          <Text style={styles.sectionTitle}>Описание деятельности</Text>
          <View style={styles.commentBox}>
            <Text style={styles.commentText}>{app.descActivity || "—"}</Text>
          </View>
        </View>

        {/* Scores */}
        <View>
          <Text style={styles.sectionTitle}>Оценка по критериям</Text>

          {/* Header row */}
          <View style={[styles.scoreRow, { borderBottom: "1pt solid #0804ff" }]}>
            <Text style={[styles.scoreLabel, { fontWeight: "bold", fontSize: 9 }]}>
              Критерий
            </Text>
            <Text style={[styles.scoreMax, { fontWeight: "bold", fontSize: 9 }]}>
              Макс.
            </Text>
            <Text style={[styles.scoreValue, { fontWeight: "bold", fontSize: 9 }]}>
              Балл
            </Text>
          </View>

          {app.scores.map((s, i) => (
            <View key={i} style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>{s.label}</Text>
              <Text style={styles.scoreMax}>/{s.max}</Text>
              <Text style={styles.scoreValue}>{s.value !== null ? s.value : "—"}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ИТОГО</Text>
            <Text style={styles.totalValue}>
              {totalScore} / {maxScore}
            </Text>
          </View>
        </View>

        {/* Expert comment */}
        <View>
          <Text style={styles.sectionTitle}>Заключение эксперта</Text>
          <View style={styles.commentBox}>
            <Text style={styles.commentText}>
              {app.expertComment || "Комментарий не указан."}
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureLine}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Эксперт</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Председатель комиссии</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>trudkrut.ru</Text>
          <Text>
            {app.id} · {date}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function ProtocolPDFButton({ app }: { app: Application }) {
  return (
    <PDFDownloadLink
      document={<ProtocolDocument app={app} />}
      fileName={`protocol-${app.id}.pdf`}
      style={{ textDecoration: "none" }}
    >
      {({ loading }) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "1px solid #2a2a32",
            borderRadius: 8,
            color: "#9a9aa4",
            fontSize: 12,
            fontWeight: 600,
            padding: "6px 14px",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
            fontFamily: "var(--font-onest), sans-serif",
          }}
        >
          {loading ? "Генерация…" : "Экспорт PDF"}
        </span>
      )}
    </PDFDownloadLink>
  );
}

export function ProtocolPDFPreview({ app }: { app: Application }) {
  return (
    <PDFViewer width="100%" height={600} style={{ borderRadius: 8 }}>
      <ProtocolDocument app={app} />
    </PDFViewer>
  );
}

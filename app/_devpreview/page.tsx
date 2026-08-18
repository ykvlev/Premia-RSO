"use client";

// ВРЕМЕННАЯ страница для визуальной проверки шеринг-карточки и конфетти. Удалить.
import { Confetti } from "@/components/apply/confetti";
import { ShareBrickCard } from "@/components/apply/share-brick-card";

export default function DevPreview() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#08080a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 40,
      }}
    >
      <Confetti />
      <ShareBrickCard
        headline="Я подал заявку"
        nomination="Работа СО смыслом"
      />
    </main>
  );
}

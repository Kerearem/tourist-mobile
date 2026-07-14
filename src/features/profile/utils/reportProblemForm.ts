import type { SupportTopic } from "../constants/supportTopics";

export type ReportProblemFormValidation =
  | { ok: true; topic: SupportTopic; message: string }
  | { ok: false; error: "topic" | "message"; title: string; description: string };

export function validateReportProblemForm(input: {
  topic: SupportTopic | null;
  message: string;
}): ReportProblemFormValidation {
  if (!input.topic) {
    return {
      ok: false,
      error: "topic",
      title: "Konu seçin",
      description: "Lütfen bir destek konusu seçin.",
    };
  }

  const message = input.message.trim();
  if (!message) {
    return {
      ok: false,
      error: "message",
      title: "Açıklama gerekli",
      description: "Lütfen sorununuzu kısaca açıklayın.",
    };
  }

  return { ok: true, topic: input.topic, message };
}

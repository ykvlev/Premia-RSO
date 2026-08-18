/** Ограничения загрузки файлов заявки (SPEC §7 п.4). Единый конфиг для клиента и сервера. */

export const uploadConfig = {
  maxFileSizeBytes: 10 * 1024 * 1024, // 10 МБ на файл
  allowedMimes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg",
    "image/png",
  ],
  /** Строка для атрибута accept у <input type="file"> */
  accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png",
} as const;

export function isAllowedMime(mime: string): boolean {
  return (uploadConfig.allowedMimes as readonly string[]).includes(mime);
}

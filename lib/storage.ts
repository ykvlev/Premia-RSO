import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Хранилище вложений заявок (SPEC §2: S3-совместимое, РФ — Yandex/VK).
 * Драйвер выбирается по env: S3_ENDPOINT задан → S3, иначе локальный диск
 * (.uploads/, dev-заглушка). В Attachment.url хранится КЛЮЧ объекта;
 * ссылка для скачивания выдаётся через getDownloadUrl (pre-signed для S3).
 */

const useS3 = Boolean(process.env.S3_ENDPOINT);

const LOCAL_DIR = path.join(process.cwd(), ".uploads");

function s3Client() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "ru-central1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
    forcePathStyle: true,
  });
}

/** Сохранить объект; возвращает ключ для Attachment.url. */
export async function putObject(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<string> {
  if (useS3) {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType,
      }),
    );
    return opts.key;
  }

  const filePath = path.join(LOCAL_DIR, opts.key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, opts.body);
  return opts.key;
}

/** Ссылка на скачивание: pre-signed URL для S3, локальный роут для dev. */
export async function getDownloadUrl(key: string): Promise<string> {
  if (useS3) {
    return getSignedUrl(
      s3Client(),
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
      { expiresIn: 60 * 10 },
    );
  }
  return `/uploads/${key}`;
}

/** Чтение локального объекта (только dev-драйвер, для роута /uploads). */
export async function readLocalObject(key: string): Promise<Buffer> {
  const filePath = path.resolve(LOCAL_DIR, key);
  // Защита от path traversal
  if (!filePath.startsWith(path.resolve(LOCAL_DIR) + path.sep)) {
    throw new Error("Недопустимый ключ объекта");
  }
  return readFile(filePath);
}

export const storageDriver = useS3 ? "s3" : "local";

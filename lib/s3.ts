import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET_EVIDENCIAS?.trim();
const region = (process.env.AWS_REGION ?? "us-east-1").trim();

function getClient(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set");
  }
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    // Evita checksum automático que puede causar SignatureDoesNotMatch
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

/**
 * Sube un archivo de evidencia a S3 y devuelve la URL pública.
 * La ruta será: evidencias/{pedidoId}/{timestamp}-{nombreOriginal}
 */
export async function uploadEvidencia(
  pedidoId: string,
  file: File
): Promise<string> {
  if (!bucket) {
    throw new Error("S3_BUCKET_EVIDENCIAS must be set");
  }
  const ext = file.name.replace(/^.*\./, "") || "jpg";
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
  const key = `evidencias/${pedidoId}/${Date.now()}-${safeName}`;

  const client = getClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "image/jpeg",
    })
  );

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Genera una URL firmada (válida ~1 hora) para ver una foto de evidencia.
 * fotoUrl es la URL guardada en BD (https://bucket.s3.region.amazonaws.com/key).
 */
export async function getSignedUrlForEvidencia(fotoUrl: string): Promise<string> {
  if (!bucket) throw new Error("S3_BUCKET_EVIDENCIAS must be set");
  const prefix = `https://${bucket}.s3.${region}.amazonaws.com/`;
  if (!fotoUrl.startsWith(prefix)) throw new Error("URL de evidencia no corresponde a este bucket");
  const key = fotoUrl.slice(prefix.length);
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

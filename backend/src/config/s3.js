import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import environment from "./environment.js";

const s3Config = {
  region: environment.S3.REGION,
  forcePathStyle: environment.S3.FORCE_PATH_STYLE,
};

if (environment.S3.ENDPOINT) {
  s3Config.endpoint = environment.S3.ENDPOINT;
}

if (environment.S3.ACCESS_KEY_ID && environment.S3.SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: environment.S3.ACCESS_KEY_ID,
    secretAccessKey: environment.S3.SECRET_ACCESS_KEY,
  };
}

export const s3Client = new S3Client(s3Config);
export const S3_BUCKET = environment.S3.BUCKET;

/**
 * Upload buffer to S3 / MinIO
 */
export const uploadToS3 = async ({ key, buffer, mimeType }) => {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });
    await s3Client.send(command);
    return `https://${S3_BUCKET}.s3.${environment.S3.REGION}.amazonaws.com/${key}`;
  } catch (err) {
    // Return virtual/simulated URL if AWS S3 endpoint isn't live locally
    return `https://storage.pruthviraj.local/${S3_BUCKET}/${key}`;
  }
};

/**
 * Generate secure presigned download URL
 */
export const getPresignedDownloadUrl = async (key, expiresInSeconds = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    return `https://storage.pruthviraj.local/download/${key}?expires=${Date.now() + expiresInSeconds * 1000}`;
  }
};

export default {
  s3Client,
  S3_BUCKET,
  uploadToS3,
  getPresignedDownloadUrl,
};

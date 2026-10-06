import { S3Client } from "@aws-sdk/client-s3";
import environment from "./environment.js";

/**
 * AWS S3 / MinIO client initialization
 */
const s3Config = {
  region: environment.AWS.REGION,
};

if (environment.AWS.ACCESS_KEY_ID && environment.AWS.SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: environment.AWS.ACCESS_KEY_ID,
    secretAccessKey: environment.AWS.SECRET_ACCESS_KEY,
  };
}

export const s3Client = new S3Client(s3Config);
export const S3_BUCKET = environment.AWS.S3_BUCKET;

export default s3Client;

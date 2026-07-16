const UPLOAD_PREFIX = "uploads/";
const RETENTION_DAYS = 7;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

type R2LikeObject = {
  key: string;
  uploaded?: Date;
  customMetadata?: Record<string, string>;
};

function parseDate(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function retentionCutoff(now = new Date()) {
  return new Date(now.getTime() - RETENTION_MS);
}

export function getUploadTimestamp(object: R2LikeObject) {
  return parseDate(object.customMetadata?.uploaded_at) ?? parseDate(object.uploaded);
}

export function isExpiredUploadObject(object: R2LikeObject, cutoff = retentionCutoff()) {
  if (!object.key.startsWith(UPLOAD_PREFIX)) {
    return false;
  }

  const uploadedAt = getUploadTimestamp(object);
  return uploadedAt !== null && uploadedAt < cutoff.getTime();
}

export async function deleteExpiredUploads(bucket: R2Bucket, now = new Date()) {
  const cutoff = retentionCutoff(now);
  let cursor: string | undefined;
  let scanned = 0;
  let eligible = 0;
  let deleted = 0;

  do {
    const listOptions = { prefix: UPLOAD_PREFIX, cursor, include: ["customMetadata"] } as R2ListOptions & {
      include: ["customMetadata"];
    };
    const page = await bucket.list(listOptions);
    scanned += page.objects.length;

    const keys = page.objects.filter((object) => isExpiredUploadObject(object, cutoff)).map((object) => object.key);
    eligible += keys.length;

    if (keys.length > 0) {
      await bucket.delete(keys);
      deleted += keys.length;
    }

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return {
    cutoff: cutoff.toISOString(),
    scanned,
    eligible,
    deleted,
  };
}

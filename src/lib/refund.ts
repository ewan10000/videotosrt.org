export function usageMonthFromCreatedAt(createdAt: string, fallbackDate = new Date()) {
  const date = new Date(createdAt);
  if (Number.isFinite(date.getTime())) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const match = /^(\d{4})-(\d{2})/.exec(createdAt);
  if (match) {
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return `${match[1]}-${match[2]}`;
  }

  return `${fallbackDate.getUTCFullYear()}-${String(fallbackDate.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function refundTransactionId(jobId: string) {
  return `refund_${jobId}`;
}


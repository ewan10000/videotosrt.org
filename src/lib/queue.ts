export const MAX_PROVIDER_ATTEMPTS = 3;

export function shouldCallTranscriptionProvider(deliveryAttempts: number) {
  return Number.isFinite(deliveryAttempts) && deliveryAttempts <= MAX_PROVIDER_ATTEMPTS;
}

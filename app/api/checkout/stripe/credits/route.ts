import { billingRoute } from '@/lib/stripe-routes';
export async function POST(request: Request) { return billingRoute(request, 'credits'); }

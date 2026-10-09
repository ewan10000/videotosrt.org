export async function POST() {
  return Response.json({ message: "New purchases use Stripe. Please reload the pricing page. Existing legacy subscriptions remain unchanged." }, { status: 410 });
}

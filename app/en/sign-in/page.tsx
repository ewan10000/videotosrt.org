import { AuthEmailRequestForm } from "@/components/auth-email-request-form";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/en/sign-in",
  title: "Sign in",
  description: "Sign in to VideoToSRT with GitHub, Google, or email.",
  robots: { index: false, follow: false }
});

export default function EnglishSignInPage() {
  return (
    <>
      <SiteNav />
      <main className="site-container grid min-h-[calc(100vh-220px)] place-items-center py-16">
        <AuthEmailRequestForm
          backHref="/"
          backLabel="Back to home"
          description="Use the same sign-in options as the editor and pricing pages. Email sign-in uses the existing VideoToSRT email-code flow."
          emailLabel="Email address"
          emailPlaceholder="you@example.com"
          mode="sign-in"
          submitLabel="Continue with email"
          successTitle="Email sign-in started"
          successBody="Use this browser to continue with VideoToSRT. If your deployment sends email codes, check your inbox for the next step."
          title="Sign in to VideoToSRT"
        />
      </main>
      <Footer />
    </>
  );
}

import { Footer } from "@/components/footer";
import { LoginModal } from "@/components/modals/login-modal";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/en/sign-in",
  title: "Sign in",
  description: "Sign in to VideoToSRT with Google.",
  robots: { index: false, follow: false }
});

export default function EnglishSignInPage() {
  return (
    <>
      <SiteNav />
      <main className="site-container grid min-h-[calc(100vh-220px)] place-items-center py-16">
        <div className="panel-card w-[min(420px,100%)] p-6 text-center">
          <h1 className="mb-3 text-3xl font-extrabold">Sign in to VideoToSRT</h1>
          <p className="mb-5 text-muted">Use Google to continue to transcription, export, checkout, and account features.</p>
          <LoginModal
            trigger={<Button variant="primary" className="w-full">Continue with Google</Button>}
            title="Sign in to VideoToSRT"
            description="Use Google to continue to VideoToSRT account features."
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

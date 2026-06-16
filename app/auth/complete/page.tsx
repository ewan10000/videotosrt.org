import { AuthCompleteClient } from "@/components/auth-complete-client";

export const metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Signing in | VideoToSRT"
};

export default function AuthCompletePage() {
  return <AuthCompleteClient />;
}

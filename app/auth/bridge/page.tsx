import { AuthBridgeClient } from "@/components/auth-bridge-client";

export const metadata = {
  robots: {
    follow: false,
    index: false
  },
  title: "Signing in | VideoToSRT"
};

export default function AuthBridgePage() {
  return <AuthBridgeClient />;
}

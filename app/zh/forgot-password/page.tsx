import { Footer } from "@/components/footer";
import { LoginModal } from "@/components/modals/login-modal";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/zh/forgot-password",
  title: "找回账号",
  description: "使用 Google 登录 VideoToSRT。",
  robots: { index: false, follow: false }
});

export default function ChineseForgotPasswordPage() {
  return (
    <>
      <SiteNav />
      <main className="site-container grid min-h-[calc(100vh-220px)] place-items-center py-16">
        <div className="panel-card w-[min(420px,100%)] p-6 text-center">
          <h1 className="mb-3 text-3xl font-extrabold">找回账号</h1>
          <p className="mb-5 text-muted">VideoToSRT 当前面向用户的登录入口为 Google。请使用 Google 继续。</p>
          <LoginModal trigger={<Button variant="primary" className="w-full">使用 Google 继续</Button>} title="登录 VideoToSRT" description="使用 Google 继续访问 VideoToSRT 账号功能。" />
        </div>
      </main>
      <Footer />
    </>
  );
}

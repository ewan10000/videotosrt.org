import { AuthEmailRequestForm } from "@/components/auth-email-request-form";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/zh/reset-password",
  title: "重置密码",
  description: "通过 VideoToSRT 现有邮箱登录流程恢复账号访问。",
  robots: { index: false, follow: false }
});

export default function ChineseResetPasswordPage() {
  return (
    <>
      <SiteNav />
      <main className="site-container grid min-h-[calc(100vh-220px)] place-items-center py-16">
        <AuthEmailRequestForm
          backHref="/"
          backLabel="返回首页"
          description="此产品当前没有独立密码重置接口。请提交账号邮箱，我们会使用现有邮箱登录码流程恢复访问。"
          emailLabel="邮箱地址"
          emailPlaceholder="you@example.com"
          mode="recovery"
          submitLabel="发送重置请求"
          successTitle="请求已提交"
          successBody="下一步请用这个邮箱完成登录。如果当前部署已配置邮件发送，请查看收件箱中的登录码或链接；否则此浏览器已按现有邮箱登录流程完成会话准备。"
          title="重置密码"
        />
      </main>
      <Footer />
    </>
  );
}

import { AuthEmailRequestForm } from "@/components/auth-email-request-form";
import { Footer } from "@/components/footer";
import { SiteNav } from "@/components/site-nav";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  path: "/zh/forgot-password",
  title: "找回账号",
  description: "通过 VideoToSRT 现有邮箱登录流程找回账号访问权限。",
  robots: { index: false, follow: false }
});

export default function ChineseForgotPasswordPage() {
  return (
    <>
      <SiteNav />
      <main className="site-container grid min-h-[calc(100vh-220px)] place-items-center py-16">
        <AuthEmailRequestForm
          backHref="/"
          backLabel="返回首页"
          description="VideoToSRT 当前使用邮箱登录码/无密码登录流程，没有单独的密码重置接口。提交邮箱后，我们会通过现有邮箱登录流程帮你恢复访问。"
          emailLabel="邮箱地址"
          emailPlaceholder="you@example.com"
          mode="recovery"
          submitLabel="发送登录请求"
          successTitle="请求已提交"
          successBody="请继续使用这个邮箱登录。如果当前部署已配置邮件发送，请查看收件箱中的登录码或链接；否则此浏览器已按现有邮箱登录流程完成会话准备。"
          title="找回账号"
        />
      </main>
      <Footer />
    </>
  );
}

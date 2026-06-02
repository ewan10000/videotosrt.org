# VideoToSRT 前端修复指令（第二轮）

修复以下问题，然后运行 `npm run build` 验证。

## 问题1：UploadStatus 组件假数据

**文件：** `components/upload-status.tsx`

当前整个组件是静态演示，硬编码了：
- 文件名：interview-cut-final.mp4
- 进度：64%
- 4 个固定步骤和状态

改为接受 props 的组件：

```ts
interface UploadStatusProps {
  filename?: string;
  progress?: number;
  status?: "idle" | "uploading" | "processing" | "complete" | "error";
}
```

实现要求：
1. 默认 props（无上传时）显示空状态：
   - 标题："No active upload"
   - 描述："Upload a video to see processing status."
   - 一个 Link 到 /editor 的按钮 "Go to editor"
2. 有 filename 时显示真实数据：
   - 文件名显示真实的 filename
   - 进度条显示真实的 progress（0-100）
   - 状态标签根据 status 显示：Uploading / Processing / Complete / Error
   - 步骤列表根据 status 动态生成，不要固定 4 步
3. 组件改为 'use client'
4. 在 home-sections.tsx 的 StatusSection 中使用时不传 props（显示空状态）

## 问题2：OG 图引用更新

**文件：** `app/layout.tsx`

已经将 public/og-image.svg 转换为 public/og-image.png（已生成）。

修改 layout.tsx 中的引用：
- images: [{ url: "/og-image.svg", ... }] 改为 images: [{ url: "/og-image.png", ... }]
- twitter.images: ["/og-image.svg"] 改为 ["/og-image.png"]

## 规则：
- 不使用 dangerouslySetInnerHTML
- TypeScript 类型正确
- 修改后运行 npm run build 验证无错误
- 不要部署，只构建验证

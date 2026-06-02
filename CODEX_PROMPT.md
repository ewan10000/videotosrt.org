# VideoToSRT 前端修复指令

修复以下所有问题，然后运行 `npm run build` 验证。

## 问题1：ExportModal 导出格式切换无内容

**文件：** `components/modals/export-modal.tsx`

当前 Tabs 只有 TabsList + TabsTrigger，没有 TabsContent。点击 SRT/VTT/TXT/ASS 无反应。

**修改：**
1. 新增 props：`subtitles?: string[][]`（格式为 [start, end, text] 的数组）和 `filename?: string`
2. 添加 state：`const [format, setFormat] = useState<"srt" | "vtt" | "txt" | "ass">("srt")`
3. Tabs 改为受控：`<Tabs value={format} onValueChange={(v) => setFormat(v as typeof format)}>`
4. 为每种格式添加 TabsContent，内含可滚动的 `<pre>` 预览框，显示该格式的实际输出：
   - SRT：标准格式，带序号、时间轴（00:00:00,000 --> 00:00:02,180）、文本
   - VTT：WEBVTT 头 + 时间轴 + 文本
   - TXT：仅文本行
   - ASS：[Script Info] + [V4+ Styles] + [Events] 的 Dialogue 行
5. 文件名输入框默认值：`{baseFilename}-subtitles.{format}`，baseFilename 从 `filename` prop 去掉扩展名得到
6. 如无 subtitles prop，预览区显示："Upload and transcribe a video to see export preview."

## 问题2：FAQ 不可折叠

**文件：** `components/sections/home-sections.tsx`

当前 FAQ 全部展开。改为可折叠：

1. 使用 `@radix-ui/react-collapsible`（已安装）
2. 创建本地 `FAQItem` 组件：
   - 问题作为按钮，点击切换展开/收起
   - 答案仅在展开时显示
   - Chevron 图标随状态旋转
   - 高度变化有过渡动画
3. `FaqSection` 改用 `FAQItem`

## 问题3：页脚年份写死

**文件：** `components/footer.tsx`

把 `© 2026 VideoToSRT` 改为 `© {new Date().getFullYear()} VideoToSRT`

## 问题4：编辑器 Export 未传递真实数据

**文件：** `components/sections/editor-client.tsx`

当前：`<ExportModal trigger={<Button variant="secondary">Export</Button>} />`

改为：`<ExportModal trigger={<Button variant="secondary">Export</Button>} subtitles={rows} filename={filename} />`

## 问题5：首页 UploadPanel 假数据

**文件：** `components/sections/home-sections.tsx`

当前 UploadPanel 下方有硬编码的假文件行（creator-launch-video.mp4、1.2GB、72%进度）。

修改：
1. 将 UploadPanel 改为 `"use client"` 组件
2. 移除假文件行
3. "Choose file" 按钮添加隐藏 file input，选择文件后导航到 `/editor`
4. 使用 `useRouter` from next/navigation

简化方案：选择文件后调用 `router.push('/editor')`，用户到编辑器再上传。

## 问题6：编辑器假字幕数据

**文件：** `components/sections/editor-client.tsx`

当前 `initialSubtitles` 是假文案（"Welcome back..." 等）。

修改：
1. `initialSubtitles` 改为空数组 `[]`
2. 当 `rows.length === 0` 时，字幕表格区域显示占位："Upload a video to generate subtitles"
3. 视频预览区保留现有占位（播放按钮）

## 问题7：定价页 FAQ（如有）

检查 `app/pricing/page.tsx` 是否有 FAQ，如有则同样改为可折叠。

## 规则：
- 不使用 dangerouslySetInnerHTML
- TypeScript 类型正确
- 使用现有 UI 模式（cn()、现有颜色变量）
- 修改后运行 `npm run build` 验证无错误
- 不要部署，只构建验证

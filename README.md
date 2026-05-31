# VideoToSRT

VideoToSRT is a Next.js 15 App Router implementation for videotosrt.org. It uses TypeScript, Tailwind CSS, local shadcn/ui-style components, OpenNext, and Cloudflare Workers.

## Routes

- `/` marketing home page
- `/pricing` pricing page with Monthly/Annual switching
- `/editor` desktop-only MVP subtitle editor
- `/privacy-policy`
- `/terms-of-service`
- `/sitemap.xml`
- `/robots.txt`

## Commands

```bash
npm install
npm run build
npm run preview
```

Deploy only after Wrangler is authenticated:

```bash
npm run deploy
```

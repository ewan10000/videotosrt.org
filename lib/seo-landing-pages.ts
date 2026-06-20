import type { Metadata } from "next";
import type { SeoLandingProps, SeoLandingStep } from "@/components/sections/seo-landing";
import {
  createBreadcrumbJsonLd,
  createFaqJsonLd,
  createHowToJsonLd,
  createPageJsonLd,
  createPageMetadata,
  createSoftwareApplicationJsonLd,
  siteUrl
} from "@/lib/metadata";

type LandingPageKey =
  | "video-to-srt"
  | "srt-editor"
  | "burn-subtitles"
  | "short-form-subtitles"
  | "podcast-transcription"
  | "course-captions"
  | "subtitle-translator"
  | "ass-subtitle-editor"
  | "public-url-subtitles";

export interface LandingPageDefinition extends SeoLandingProps {
  path: `/${LandingPageKey}`;
  metaTitle: string;
  metaDescription: string;
  howToName?: string;
  howToSteps?: SeoLandingStep[];
}

const languages = "English, Spanish, French, German, Italian, Portuguese, Dutch, Arabic, Hindi, Japanese, Korean, Chinese, and many more";

export const landingPages = {
  "video-to-srt": {
    path: "/video-to-srt",
    metaTitle: "Video to SRT Converter - Free Online",
    metaDescription: "Convert video to SRT online with AI transcription, inline editing, and clean SRT, VTT, or TXT export.",
    title: "Video to SRT Converter - Free Online",
    eyebrow: "AI subtitle transcription",
    description: "Use VideoToSRT as a video to SRT converter for MP4, MOV, WebM, and other common media files. Upload a video, review the automatic transcript in the browser, fix timing or wording, and export a clean subtitle file without installing desktop software.",
    highlights: ["Convert video to SRT online", "Edit transcript text and timestamps inline", "Export SRT, VTT, or TXT from one workspace", "Useful for MP4 subtitles, captions, clips, and accessibility"],
    howToName: "How to Convert Video to SRT",
    howToSteps: [
      { title: "Step 1 - Upload Your Video", body: "Drag your video into VideoToSRT or start from the upload area. The editor accepts video and audio workflows and prepares the file for transcription." },
      { title: "Step 2 - AI Auto-Transcription", body: "The transcription job creates subtitle lines that you can review beside the media preview. Clear audio produces the best starting point." },
      { title: "Step 3 - Export Clean SRT", body: "Fix names, punctuation, line breaks, and timestamps, then export SRT for players, platforms, editors, or archive use." }
    ],
    sections: [
      {
        heading: "What Is an SRT File and Why Do You Need One?",
        body: [
          "An SRT file is a plain-text subtitle file that stores caption numbers, start times, end times, and the text viewers see on screen.",
          "Creators use SRT files because they are portable. You can upload an SRT to YouTube, attach it to an MP4 in many players, translate it into another language, or keep it as an editable transcript. A video to SRT converter is helpful when you have the final media but not a clean subtitle file.",
          "VideoToSRT focuses on that workflow: automatic video transcription to SRT, fast cleanup, and export. It is also useful when you need to extract subtitles from video content you have the rights to process."
        ],
        links: [
          { label: "Edit an existing SRT file online", href: "/srt-editor" },
          { label: "Translate an SRT after export", href: "/subtitle-translator" }
        ]
      },
      {
        heading: "How to Convert Video to SRT in 3 Steps",
        body: ["The conversion workflow keeps upload, transcript cleanup, and export in one browser-based editor."],
        steps: [
          { title: "Step 1 - Upload Your Video", body: "Start with MP4, MOV, WebM, or another common media file. You can also use audio when the goal is transcript cleanup." },
          { title: "Step 2 - AI Auto-Transcription", body: "The app creates editable subtitle rows with timing. Review the rough transcript instead of retyping captions from scratch." },
          { title: "Step 3 - Export Clean SRT", body: "Correct wording, timing, and long lines, then download SRT. VTT and TXT export are available for related publishing workflows." }
        ]
      },
      {
        heading: "Supported Video Formats",
        body: [
          "Most browser-friendly video and audio files can be used in the workflow, including MP4, MOV, AVI, MKV, WebM, MP3, WAV, M4A, AAC, and FLAC.",
          "For the smoothest MP4 to SRT converter workflow, use clear speech, avoid heavy background music, and upload the highest-quality audio track you have. If the transcript needs cleanup, the editor is built for quick line-by-line correction."
        ],
        features: [
          { title: "MP4 to SRT", body: "Create subtitle files for the most common web video format." },
          { title: "MOV and WebM", body: "Work with creator and browser video formats without a desktop subtitle suite." },
          { title: "Audio Sources", body: "Use podcast and lecture audio when the final deliverable is an SRT or transcript." },
          { title: "Manual Cleanup", body: "Fix names, technical terms, punctuation, and timing before export." }
        ]
      },
      {
        heading: "Why Choose VideoToSRT Over Other Converters?",
        body: ["A free video to SRT converter is most useful when it gives you an editable result, not just a raw transcript."],
        table: {
          columns: ["Workflow", "VideoToSRT", "Generic web converter", "Desktop subtitle suite"],
          rows: [
            ["Transcribe video to subtitles", "AI transcript plus editor", "Often transcript-only", "Usually manual or plugin-based"],
            ["Edit SRT file online", "Inline text and timing cleanup", "Limited or separate step", "Strong editing, but install required"],
            ["Export formats", "SRT, VTT, and TXT today", "Varies by tool", "Often broad but more complex"],
            ["Best fit", "Creators who need fast browser cleanup", "One-off rough files", "Advanced offline subtitle production"]
          ]
        }
      },
      {
        heading: "When to Use SRT, VTT, TXT, or Burn-In Preview",
        body: [
          "Use SRT when you need a widely accepted subtitle file. Use VTT for web players that prefer WebVTT. Use TXT when you want a readable transcript for notes, posts, or repurposing.",
          "If you need permanent captions in the video image, review the burn subtitles workflow. MP4 burn-in export is positioned for paid-plan workflows and should be checked against current plan availability before promising a client deliverable."
        ],
        links: [
          { label: "Compare hardcoded subtitles and SRT", href: "/burn-subtitles" },
          { label: "Generate subtitles from a public URL", href: "/public-url-subtitles" }
        ]
      }
    ],
    faq: [
      { question: "Is the video to SRT converter free?", answer: "You can start the video to SRT workflow for free and edit subtitles in the browser. Plan limits may apply to minutes, export options, and paid features, so check pricing before large batches." },
      { question: "How accurate is the transcription?", answer: "Accuracy depends on audio quality, accents, background noise, and speaker overlap. Clear speech gives the best result, and every line can be edited before you export the SRT." },
      { question: "What languages are supported?", answer: `The workflow is designed for transcription in 50+ languages, including ${languages}. Always review names and specialized vocabulary before publishing.` },
      { question: "Can I edit the SRT before exporting?", answer: "Yes. The editor lets you correct subtitle text and timing inline, which is why the workflow is better than downloading an unreviewed automatic transcript." },
      { question: "Is my video data secure?", answer: "VideoToSRT processes uploaded content for the subtitle workflow and does not claim rights to your media. You are responsible for having permission to process any content you upload." },
      { question: "What video formats are supported?", answer: "Common media formats such as MP4, MOV, AVI, MKV, and WebM are suitable starting points. Browser behavior and file encoding can still affect preview quality." },
      { question: "How long does the conversion take?", answer: "Short clips usually finish faster than long recordings. Audio clarity, file size, provider queue time, and network speed all affect total processing time." },
      { question: "Can I convert multiple videos at once?", answer: "Batch-oriented workflows are part of the product direction and plan positioning. For production batches, confirm your current plan limits before uploading many files." },
      { question: "Can I extract subtitles from video?", answer: "You can generate a new subtitle file from a video you are allowed to process. If a video already has burned-in captions, those cannot be removed as editable subtitle tracks." }
    ],
    cta: {
      heading: "Start Converting Your Video to SRT Now",
      body: "Upload a file, let AI create the first draft, then use the editor to make the subtitle file publishable.",
      primary: { label: "Upload Video - Free", href: "/#upload" },
      secondary: { label: "Open SRT Editor", href: "/srt-editor" }
    },
    links: [
      { label: "SRT Editor Online", href: "/srt-editor" },
      { label: "Burn Subtitles into Video", href: "/burn-subtitles" },
      { label: "Translate Subtitles Online", href: "/subtitle-translator" },
      { label: "Public URL Subtitle Editor", href: "/public-url-subtitles" }
    ]
  },
  "srt-editor": {
    path: "/srt-editor",
    metaTitle: "SRT Editor Online - Edit Subtitles in Your Browser",
    metaDescription: "Edit SRT files online, fix timing, sync subtitles with video, preview changes, and export clean subtitle files.",
    title: "SRT Editor Online - Edit Subtitles in Your Browser",
    eyebrow: "Browser subtitle editor",
    description: "Open an online SRT editor when your captions are close but not publishable. VideoToSRT helps you edit subtitle text, adjust timing, preview lines against video, and export a cleaner SRT without installing a desktop program.",
    highlights: ["Edit SRT file online", "Fix timing errors and long lines", "Preview subtitles with video", "Export SRT, VTT, or TXT"],
    howToName: "How to Edit an SRT File Online",
    howToSteps: [
      { title: "Upload Your SRT and Video", body: "Start with an existing subtitle file and a matching media file, or create subtitles from an upload first." },
      { title: "Make Edits in the Timeline", body: "Correct text, scan the preview, and nudge subtitle timing so captions match the spoken words." },
      { title: "Export the Perfect SRT", body: "Download the cleaned SRT for your player, video platform, archive, or translation workflow." }
    ],
    sections: [
      {
        heading: "What Can You Do with Our Online SRT Editor?",
        body: ["A good SRT subtitle editor helps with the practical fixes that happen after transcription: timing drift, misspelled names, awkward line breaks, and captions that stay on screen too long."],
        features: [
          { title: "Fix Timing Errors", body: "Review start and end times while watching the media preview, then adjust lines that appear early or late." },
          { title: "Edit Subtitle Text Inline", body: "Correct punctuation, speaker names, product terms, and line breaks directly in the browser." },
          { title: "Sync Subtitles with Video", body: "Use the preview to catch drift and improve readability before publishing." },
          { title: "Preview Changes in Real Time", body: "Keep video context and caption text in the same workspace instead of switching between tools." }
        ]
      },
      {
        heading: "How to Edit an SRT File Online",
        body: ["The edit srt file online workflow is intentionally simple: load the source, make the corrections, export a clean file."],
        steps: [
          { title: "Upload Your SRT and Video", body: "Bring in the subtitle file and media so the editor can show captions against the content." },
          { title: "Make Edits in the Timeline", body: "Move through lines, correct text, and fix timing issues that automatic transcription missed." },
          { title: "Export the Perfect SRT", body: "Save SRT for broad compatibility, or use VTT and TXT when the platform or transcript workflow needs them." }
        ]
      },
      {
        heading: "SRT Editor vs. Desktop Software",
        body: ["Desktop tools such as Aegisub and Subtitle Edit are powerful, especially for advanced styling or offline work. A browser SRT timing editor is better when speed, access, and collaboration matter more than complex local setup."],
        table: {
          columns: ["Need", "VideoToSRT online editor", "Aegisub or Subtitle Edit"],
          rows: [
            ["Install required", "No install; runs in browser", "Desktop install required"],
            ["Quick text cleanup", "Focused inline editing", "Available but more complex"],
            ["Advanced style authoring", "Best handled through ASS workflow pages and plan features", "Strong local controls"],
            ["Best use case", "Fast subtitle cleanup and export", "Detailed offline subtitle production"]
          ]
        }
      },
      {
        heading: "Supported Subtitle Formats",
        body: [
          "SRT is the most common format for simple captions. VTT is common for web players. TXT is useful when you need transcript text without timestamps. ASS and SSA are used for styled subtitles when font, color, and positioning matter.",
          "If you need style-heavy captions, start with the ASS subtitle editor page. If you need the captions visible in every player, review the burn subtitles page before choosing a final export workflow."
        ],
        links: [
          { label: "Work with styled ASS subtitles", href: "/ass-subtitle-editor" },
          { label: "Burn subtitles into video", href: "/burn-subtitles" }
        ]
      },
      {
        heading: "When an Online SRT Editor Saves Time",
        body: [
          "Use a free online SRT editor when a transcript is mostly correct but needs a human pass. Typical fixes include replacing guessed names, shortening long captions, preserving meaning across line breaks, and making sure timestamps match the video.",
          "The same cleanup pass also prepares captions for translation, course upload, podcast clips, and short-form videos."
        ],
        links: [
          { label: "Translate cleaned subtitles", href: "/subtitle-translator" },
          { label: "Create course captions", href: "/course-captions" }
        ]
      }
    ],
    faq: [
      { question: "Can I edit SRT without installing software?", answer: "Yes. VideoToSRT is an online SRT editor, so you can review and correct subtitle files in the browser instead of installing a desktop subtitle application." },
      { question: "Does the editor work on Mac and Windows?", answer: "Because it runs in a browser, the editor is designed for modern Mac, Windows, Linux, and Chromebook workflows. A current browser gives the best experience." },
      { question: "Can I adjust subtitle timing?", answer: "Yes. The editor is built for text and timing cleanup, so you can correct captions that appear too early, too late, or for the wrong duration." },
      { question: "How do I merge or split subtitle lines?", answer: "When a transcript creates awkward captions, edit the text and timing so each line is readable. Keep captions short enough for viewers to follow naturally." },
      { question: "Can I edit SRT on mobile?", answer: "The browser workflow can open on mobile, but subtitle editing is much easier on a desktop or tablet because timing and text review need screen space." },
      { question: "Is the SRT editor free to use?", answer: "You can start editing for free. Some higher-volume, style, burn-in, or export workflows may depend on plan limits." },
      { question: "Can I preview subtitles while editing?", answer: "Yes. The workflow is designed to keep the media preview near the subtitle rows so you can verify wording and timing before export." },
      { question: "How do I fix overlapping subtitles?", answer: "Review neighboring timestamps and adjust the end time of the earlier caption or the start time of the next caption so the lines do not collide." },
      { question: "Can I use the editor after converting video to SRT?", answer: "Yes. After automatic transcription, use the same cleanup workflow to correct the SRT before publishing or translating it." }
    ],
    cta: {
      heading: "Open the SRT Editor Now",
      body: "Use the browser editor to clean subtitle text, fix timing, and prepare a file that is ready for publishing.",
      primary: { label: "Open Editor", href: "/editor" },
      secondary: { label: "Convert Video to SRT", href: "/video-to-srt" }
    },
    links: [
      { label: "Video to SRT Converter", href: "/video-to-srt" },
      { label: "Subtitle Translator", href: "/subtitle-translator" },
      { label: "ASS Subtitle Editor", href: "/ass-subtitle-editor" },
      { label: "Course Caption Generator", href: "/course-captions" }
    ]
  },
  "burn-subtitles": {
    path: "/burn-subtitles",
    metaTitle: "Burn Subtitles into Video Online - Hardcode MP4",
    metaDescription: "Learn when to hardcode subtitles into MP4, compare burned captions with SRT files, and prepare captions for export.",
    title: "Burn Subtitles into Video Online - Hardcode MP4",
    eyebrow: "Hardcoded subtitle workflow",
    description: "Burning subtitles means making captions part of the video image. VideoToSRT supports the preparation workflow for hardcoded subtitles: generate or upload captions, check timing, preview readability, and understand when permanent captions are better than a separate SRT file.",
    highlights: ["Prepare captions for hardcoded MP4 workflows", "Compare soft subtitles and burned captions", "Preview readability before committing", "Useful for social clips and player compatibility"],
    howToName: "How to Burn Subtitles into MP4",
    howToSteps: [
      { title: "Upload Your Video and SRT", body: "Start with a video and subtitle file, or generate subtitles from the video first." },
      { title: "Choose Plain or Styled Captions", body: "Review caption placement, length, and styling intent so text remains readable on mobile screens." },
      { title: "Preview and Export MP4", body: "Use preview to catch errors before committing to a hardcoded export workflow. Confirm current plan availability for final burn-in export." }
    ],
    sections: [
      {
        heading: "What Does Burn Subtitles Mean?",
        body: [
          "To burn subtitles into video is to hardcode captions into the pixels of the exported video. The viewer does not turn them on or off; they are always visible.",
          "Soft subtitles, such as SRT or VTT files, stay separate from the video and can often be toggled, translated, or replaced. Hardcoded subtitles are better when you need one MP4 that looks the same on every platform, but they are harder to change later."
        ]
      },
      {
        heading: "How to Burn Subtitles into MP4",
        body: ["A careful hardcode subtitles MP4 workflow starts with accurate caption text and timing. Fix the subtitles before you create a permanent video."],
        steps: [
          { title: "Upload Your Video and SRT", body: "Generate captions from a video or upload an existing subtitle file for cleanup." },
          { title: "Choose Style and Placement", body: "Use plain readable captions or a styled workflow when the platform and plan support it." },
          { title: "Preview and Export MP4", body: "Preview the result before export so mistakes are not baked into the final file." }
        ]
      },
      {
        heading: "Why Burn Subtitles Instead of Using SRT?",
        body: [
          "Burned captions are useful for TikTok, Instagram Reels, YouTube Shorts, LinkedIn videos, sales clips, and any destination where viewers may watch muted or where subtitle upload support is inconsistent.",
          "SRT remains the better choice when accessibility controls, translations, or later edits matter. If the video will live on a platform with strong caption support, upload the SRT as a separate track."
        ],
        links: [
          { label: "Make short-form captions", href: "/short-form-subtitles" },
          { label: "Export a separate SRT first", href: "/video-to-srt" }
        ]
      },
      {
        heading: "Burn Subtitles vs. SRT Files - Which Should You Choose?",
        body: ["Choose based on whether viewers need control or you need a single permanent MP4."],
        table: {
          columns: ["Factor", "Burned subtitles", "SRT or VTT file"],
          rows: [
            ["Viewer control", "Always visible", "Usually toggleable"],
            ["Compatibility", "Works anywhere the video plays", "Depends on platform subtitle support"],
            ["Editing later", "Requires a new video export", "Edit or replace the subtitle file"],
            ["Best for", "Social clips and universal playback", "Accessibility, translation, and long-term reuse"]
          ]
        }
      },
      {
        heading: "Supported Platforms After Export",
        body: [
          "Hardcoded captions are common for YouTube Shorts, TikTok, Instagram Reels, LinkedIn, internal training clips, and ad creatives. They are especially helpful when most viewers watch without sound.",
          "Keep the SRT source file even when you create permanent subtitles. It gives you a clean base for translation, timing fixes, or a second export with different caption styling."
        ],
        features: [
          { title: "TikTok and Reels", body: "Use concise captions with high contrast for vertical mobile viewing." },
          { title: "YouTube Shorts", body: "Place text where it avoids platform controls and remains readable." },
          { title: "LinkedIn", body: "Permanent captions help business viewers follow muted autoplay videos." },
          { title: "Course Clips", body: "Burned captions can simplify playback in restricted environments." }
        ]
      }
    ],
    faq: [
      { question: "Can I burn subtitles for free?", answer: "You can prepare and preview subtitle workflows for free, but final burn-in export may be tied to paid-plan availability. Check pricing before relying on MP4 export." },
      { question: "What subtitle styles are available?", answer: "VideoToSRT supports plain subtitle cleanup today and positions styled caption workflows around ASS/SSA and plan features. Keep styles readable and high contrast." },
      { question: "Will the video quality drop?", answer: "Any video re-export can affect quality depending on encoding settings. Keep the source file and subtitle file so you can export again if needed." },
      { question: "Can I burn subtitles on mobile?", answer: "You can review pages on mobile, but preparing hardcoded captions is easier on a larger screen where timing, placement, and text length are visible." },
      { question: "How long does the burning process take?", answer: "The export time depends on video length, resolution, queue time, and encoding settings. Short clips are faster than long high-resolution videos." },
      { question: "Can I burn subtitles in different languages?", answer: "Yes, if you have a subtitle file in the target language. Translate or edit the SRT first, then use it for the hardcoded subtitle workflow." },
      { question: "What is the difference between soft and hard subtitles?", answer: "Soft subtitles are separate tracks such as SRT or VTT. Hard subtitles are permanent pixels in the video and cannot be switched off by the viewer." },
      { question: "Can I remove burned subtitles later?", answer: "Not cleanly. Because the captions are part of the image, you should keep the original video and SRT so you can create a version without burned captions." },
      { question: "Should I use SRT or hardcoded subtitles for accessibility?", answer: "Use SRT or VTT when the platform supports proper caption tracks. Burned captions help visibility, but separate subtitle tracks give viewers more control." }
    ],
    cta: {
      heading: "Burn Subtitles into Your Video Now",
      body: "Start by creating a clean SRT, then preview how captions should read before you commit to a permanent video export.",
      primary: { label: "Create SRT First", href: "/video-to-srt" },
      secondary: { label: "See Pricing", href: "/pricing" }
    },
    links: [
      { label: "Video to SRT Converter", href: "/video-to-srt" },
      { label: "Short-form Subtitle Generator", href: "/short-form-subtitles" },
      { label: "ASS Subtitle Editor", href: "/ass-subtitle-editor" },
      { label: "Subtitle Translator", href: "/subtitle-translator" }
    ]
  },
  "short-form-subtitles": {
    path: "/short-form-subtitles",
    metaTitle: "Short-form Subtitle Generator - Styled Captions for TikTok, Reels, Shorts",
    metaDescription: "Generate and edit captions for TikTok, Instagram Reels, and YouTube Shorts with short-form subtitle workflows.",
    title: "Short-form Subtitle Generator - Styled Captions for TikTok, Reels, Shorts",
    eyebrow: "Vertical video captions",
    description: "Short videos need captions that are readable fast. Use VideoToSRT as a short form subtitle generator to transcribe clips, edit the lines, and prepare captions for TikTok, Instagram Reels, YouTube Shorts, and other vertical video workflows.",
    highlights: ["TikTok subtitle generator workflow", "Instagram Reel captions cleanup", "YouTube Shorts subtitles", "Readable short lines for mobile screens"],
    howToName: "How to Add Styled Subtitles to Short Videos",
    howToSteps: [
      { title: "Upload Your Short Video", body: "Start with the clip you plan to post and generate subtitle lines from the spoken audio." },
      { title: "Choose a Caption Style", body: "Keep the wording short and use styling only when it improves readability. Advanced style workflows depend on current plan support." },
      { title: "Export for TikTok, Reels, or Shorts", body: "Save the subtitle file or prepare the caption source for a burn-in workflow when permanent captions are required." }
    ],
    sections: [
      {
        heading: "Why Short-form Content Needs Styled Subtitles",
        body: [
          "Many viewers discover short-form content with sound off or in noisy environments. Captions make the hook understandable before the viewer decides to keep watching.",
          "Styled captions can also help emphasize a phrase, but the first priority is accuracy. A clean transcript with short lines beats a flashy caption that is hard to read."
        ]
      },
      {
        heading: "How to Add Styled Subtitles to Short Videos",
        body: ["The workflow starts with transcription and cleanup. From there, choose whether you need a separate subtitle file, a styled ASS workflow, or hardcoded captions."],
        steps: [
          { title: "Upload Your Short Video", body: "Use the same clip you plan to publish so timing matches the final edit." },
          { title: "Choose a Caption Style", body: "Plan high-contrast text, sensible placement, and short phrases that fit vertical screens." },
          { title: "Export for TikTok, Reels, or Shorts", body: "Use SRT/VTT/TXT today, or continue into burn-in and styled workflows where your plan supports them." }
        ]
      },
      {
        heading: "Subtitle Styles Available",
        body: [
          "Short-form creators often use plain captions, highlight captions, karaoke-style emphasis, or large centered text. VideoToSRT is a practical place to create the accurate subtitle source before styling decisions become permanent.",
          "For style-heavy work, ASS/SSA files support font, color, and positioning concepts. For final permanent captions, review the burn subtitles workflow and current plan availability."
        ],
        features: [
          { title: "Plain Captions", body: "Best for clarity, accessibility, and fast review." },
          { title: "Highlight Intent", body: "Use emphasis sparingly for hooks, keywords, and speaker changes." },
          { title: "ASS Styling", body: "Plan font, color, and position when using styled subtitle workflows." },
          { title: "Burn-In Preview", body: "Check readability before permanent captions are exported." }
        ]
      },
      {
        heading: "Platform-Specific Export Settings",
        body: ["TikTok, Instagram Reels, and YouTube Shorts all favor vertical 9:16 viewing, but caption placement and safe areas still matter."],
        features: [
          { title: "TikTok 9:16", body: "Keep captions away from interface controls and use brief lines for fast scrolling viewers." },
          { title: "Instagram Reels 9:16", body: "Make text readable over busy footage and avoid placing important words near the bottom controls." },
          { title: "YouTube Shorts 9:16", body: "Use clear timing and avoid long multi-line captions that cover the subject." },
          { title: "Repurposed Clips", body: "Export text or subtitle files so one transcript can support several platform versions." }
        ]
      },
      {
        heading: "Short-form Captions vs. Long-form Subtitles",
        body: ["Short videos reward concise captions with quick pacing. Long videos usually need consistent readability, less visual emphasis, and subtitle tracks that viewers can toggle or translate."],
        table: {
          columns: ["Need", "Short-form subtitles", "Long-form subtitles"],
          rows: [
            ["Line length", "Short, punchy, mobile-first", "Readable but less compressed"],
            ["Style", "Often higher contrast or emphasis", "Usually simple and consistent"],
            ["Export path", "SRT source plus optional burn-in workflow", "SRT or VTT track for platforms"],
            ["Best pages", "Short-form and burn subtitles", "Video to SRT and SRT editor"]
          ]
        }
      }
    ],
    faq: [
      { question: "Can I add subtitles to TikTok videos?", answer: "Yes. Generate a caption source from your clip, edit it for accuracy, and use the subtitle or burn-in workflow that matches your publishing process." },
      { question: "What caption styles work best for short videos?", answer: "High-contrast, short, well-timed captions work best. Style should support readability rather than cover the subject or distract from the hook." },
      { question: "Can I export subtitles for Instagram Reels?", answer: "You can export subtitle files for reuse and prepare caption text for Reels workflows. If you need permanent captions, confirm burn-in export availability for your plan." },
      { question: "Do styled subtitles increase engagement?", answer: "Captions can help viewers understand muted videos, which may improve watch time. Results still depend on the content, hook, pacing, and audience." },
      { question: "Can I add animated captions?", answer: "Animation-heavy caption export is not something to overpromise here. Use VideoToSRT to create accurate subtitle text and timing, then use supported style workflows where available." },
      { question: "What is the best font for TikTok captions?", answer: "Use a bold, readable font with strong contrast. Avoid thin fonts, tiny text, and placement that conflicts with platform controls." },
      { question: "Can I add subtitles to YouTube Shorts?", answer: "Yes. Create and clean subtitle text for the clip, then publish through a separate subtitle file or a permanent-caption workflow depending on your needs." },
      { question: "Are styled subtitles free to use?", answer: "Basic subtitle creation can start for free. Advanced style templates, burn-in preview, or paid export features may depend on the current plan." },
      { question: "Should I use SRT or burned captions for short videos?", answer: "Use burned captions when you need the text visible everywhere. Keep an SRT source file for edits, translations, and future versions." }
    ],
    cta: {
      heading: "Generate Styled Subtitles Now",
      body: "Create accurate caption text first, then prepare the right export path for the social platform you are targeting.",
      primary: { label: "Upload Video - Free", href: "/#upload" },
      secondary: { label: "Review Burn-In Workflow", href: "/burn-subtitles" }
    },
    links: [
      { label: "Burn Subtitles into Video", href: "/burn-subtitles" },
      { label: "Video to SRT Converter", href: "/video-to-srt" },
      { label: "ASS Subtitle Editor", href: "/ass-subtitle-editor" },
      { label: "Subtitle Translator", href: "/subtitle-translator" }
    ]
  },
  "podcast-transcription": {
    path: "/podcast-transcription",
    metaTitle: "Podcast Transcription to SRT - Online",
    metaDescription: "Transcribe podcast audio to editable SRT, VTT, or TXT for clips, accessibility, show notes, and republishing.",
    title: "Podcast Transcription to SRT - Online",
    eyebrow: "Audio subtitle workflow",
    description: "Turn podcast audio into editable subtitles and transcript files for clips, show notes, course extracts, and accessible distribution. VideoToSRT helps you auto transcribe podcast content, review the text, and export SRT, VTT, or TXT.",
    highlights: ["Podcast transcription to SRT", "MP3, WAV, M4A, AAC, and FLAC workflows", "Editable transcript lines", "Useful for clips, show notes, and captions"],
    howToName: "How to Transcribe a Podcast to SRT",
    howToSteps: [
      { title: "Upload Audio File", body: "Start from a podcast episode, clip, or cleaned audio file." },
      { title: "AI Transcription in 50+ Languages", body: "Generate subtitle text from the spoken audio, then review the transcript." },
      { title: "Edit Speaker Labels and Timing", body: "Correct names, terms, and timestamps so the transcript is useful for viewers and readers." },
      { title: "Export SRT or VTT", body: "Save a subtitle file for clips and platforms, or export TXT for show notes and repurposing." }
    ],
    sections: [
      {
        heading: "Why Transcribe Your Podcast to SRT?",
        body: [
          "Podcast transcription makes spoken content easier to search, quote, repurpose, and understand. An SRT file also lets you caption audiograms, video podcasts, and short clips taken from longer episodes.",
          "A podcast to SRT converter is especially useful when a single episode becomes many assets: a YouTube upload, social clips, a blog post, a newsletter excerpt, and an archive transcript."
        ],
        links: [
          { label: "Create captions for course audio", href: "/course-captions" },
          { label: "Convert video podcast clips to SRT", href: "/video-to-srt" }
        ]
      },
      {
        heading: "How to Transcribe a Podcast to SRT",
        body: ["Use the audio transcription workflow to create a first draft, then edit it like a subtitle file."],
        steps: [
          { title: "Upload Audio File", body: "Use MP3, WAV, M4A, AAC, FLAC, or another suitable audio source." },
          { title: "AI Transcription in 50+ Languages", body: "Generate transcript lines quickly, then review the result for names and specialized vocabulary." },
          { title: "Edit Speaker Labels and Timing", body: "Clean speaker turns, remove obvious mistakes, and align captions with clips." },
          { title: "Export SRT or VTT", body: "Use SRT for broad platform support, VTT for web players, and TXT for show notes." }
        ]
      },
      {
        heading: "Supported Audio Formats",
        body: ["Podcast and audio workflows commonly start from MP3, WAV, M4A, AAC, and FLAC. The cleaner the source, the better the automatic transcript."],
        features: [
          { title: "MP3", body: "Common for published podcast episodes and downloads." },
          { title: "WAV", body: "Useful when you still have a high-quality production export." },
          { title: "M4A and AAC", body: "Common from recording apps, phones, and editing tools." },
          { title: "FLAC", body: "Useful for archival audio where quality matters." }
        ]
      },
      {
        heading: "Podcast Transcription Accuracy",
        body: [
          "AI podcast transcription works best with clear speakers, low background noise, and consistent recording levels. Crosstalk, music beds, room echo, and niche terminology can reduce accuracy.",
          "That is why editing matters. Use the transcript as a fast first draft, then correct names, product terms, acronyms, and timestamps before you publish subtitles or show notes."
        ],
        table: {
          columns: ["Audio condition", "Expected cleanup", "Practical tip"],
          rows: [
            ["Clear solo host", "Light punctuation and naming fixes", "Export SRT quickly after review"],
            ["Interview with two speakers", "Speaker turn and name cleanup", "Review the transcript before clipping"],
            ["Noisy remote call", "More manual correction", "Use the cleanest audio mix available"],
            ["Technical episode", "Vocabulary review", "Check acronyms, product names, and jargon"]
          ]
        }
      },
      {
        heading: "Repurpose Podcast Transcripts",
        body: [
          "A free podcast transcription workflow is not only for captions. TXT exports can become show notes, quote banks, accessibility documents, internal summaries, or search-friendly episode pages.",
          "When you make video clips from the episode, keep the SRT source close so each short-form version starts from accurate words and timing."
        ],
        links: [
          { label: "Make short-form subtitles", href: "/short-form-subtitles" },
          { label: "Edit the exported SRT", href: "/srt-editor" }
        ]
      }
    ],
    faq: [
      { question: "Can I transcribe podcasts for free?", answer: "You can start podcast transcription for free. Longer episodes, large volumes, or paid export features may depend on current plan limits." },
      { question: "How accurate is AI podcast transcription?", answer: "Accuracy depends on recording quality, speaker overlap, background noise, and vocabulary. Always review the transcript before publishing." },
      { question: "Can I add speaker labels?", answer: "You can edit transcript text inline, including speaker names or labels. For multi-speaker episodes, review turns carefully before export." },
      { question: "What audio formats are supported?", answer: "Podcast workflows commonly use MP3, WAV, M4A, AAC, and FLAC. Browser and encoding details can affect preview and upload behavior." },
      { question: "How long does transcription take?", answer: "Short clips usually finish faster than full episodes. File size, duration, network speed, and provider queue time all affect processing time." },
      { question: "Can I transcribe multiple speakers?", answer: "Yes, but overlapping speakers require more review. Edit labels, names, and unclear sections before exporting a final SRT or transcript." },
      { question: "Is my podcast audio secure?", answer: "Your audio is used for the subtitle workflow, and you keep rights to your content. Only upload files you have permission to process." },
      { question: "Can I export in VTT format?", answer: "Yes. SRT, VTT, and TXT are available export formats for subtitle, web player, and transcript workflows." },
      { question: "Can I use the transcript for show notes?", answer: "Yes. Export TXT or copy cleaned transcript text for summaries, quotes, newsletters, and episode pages." }
    ],
    cta: {
      heading: "Transcribe Your Podcast Now",
      body: "Create a transcript draft, clean it in the editor, and export subtitles or text for every place your episode appears.",
      primary: { label: "Upload Audio - Free", href: "/#upload" },
      secondary: { label: "Course Caption Workflow", href: "/course-captions" }
    },
    links: [
      { label: "Video to SRT Converter", href: "/video-to-srt" },
      { label: "Course Caption Generator", href: "/course-captions" },
      { label: "SRT Editor Online", href: "/srt-editor" },
      { label: "Short-form Subtitle Generator", href: "/short-form-subtitles" }
    ]
  },
  "course-captions": {
    path: "/course-captions",
    metaTitle: "Online Course Caption Generator - For Educators",
    metaDescription: "Generate captions for lectures and online courses, edit technical terms, and export SRT or VTT for LMS workflows.",
    title: "Online Course Caption Generator - For Educators",
    eyebrow: "Education captions",
    description: "Create captions for lectures, lessons, training videos, and course clips. VideoToSRT helps educators and course teams generate subtitles, review technical vocabulary, and export files for LMS and video-player workflows.",
    highlights: ["Online course caption generator", "Lecture caption generator workflow", "Educational video subtitles", "SRT and VTT exports for course players"],
    howToName: "How to Generate Course Captions",
    howToSteps: [
      { title: "Upload Your Lecture Video", body: "Start from a lesson, training module, webinar, or course clip." },
      { title: "Auto-Transcribe with AI", body: "Generate a timed transcript in the browser." },
      { title: "Edit for Technical Terms", body: "Correct names, formulas, acronyms, and subject-specific vocabulary." },
      { title: "Export SRT for LMS", body: "Download SRT or VTT for your course platform, player, or accessibility workflow." }
    ],
    sections: [
      {
        heading: "Why Captions Are Essential for Online Courses",
        body: [
          "Captions help learners follow lessons in noisy spaces, quiet offices, and second-language settings. They also support accessibility expectations and make course content easier to search and review.",
          "For educators, the best lecture caption generator is not just automatic. It must let you correct technical terms, align timing, and export files that work with your teaching platform."
        ]
      },
      {
        heading: "How to Generate Course Captions",
        body: ["Turn lecture video into educational video subtitles, then review the words students will rely on."],
        steps: [
          { title: "Upload Your Lecture Video", body: "Use the final lesson video whenever possible so captions match the published edit." },
          { title: "Auto-Transcribe with AI", body: "Create a timed caption draft without manually typing the lecture." },
          { title: "Edit for Technical Terms", body: "Review names, equations, product terms, citations, and uncommon vocabulary." },
          { title: "Export SRT for LMS", body: "Download SRT or VTT for course platforms and web video players." }
        ]
      },
      {
        heading: "LMS Platform Compatibility",
        body: [
          "Course platforms and learning management systems commonly accept subtitle files such as SRT or VTT, though exact upload steps vary. VideoToSRT focuses on producing clean subtitle files you can take into those systems.",
          "Use exported captions with workflows for Udemy, Teachable, Coursera, Moodle, Canvas, internal training portals, and web players that support caption tracks."
        ],
        features: [
          { title: "Udemy", body: "Generate captions for course videos, then follow Udemy's current subtitle upload workflow." },
          { title: "Teachable", body: "Prepare SRT or VTT files for lesson videos and student accessibility." },
          { title: "Moodle and Canvas", body: "Use caption files alongside hosted course media or compatible video tools." },
          { title: "Internal LMS", body: "Keep SRT and TXT files for compliance, review, and localization." }
        ]
      },
      {
        heading: "Caption Quality for Technical Lessons",
        body: [
          "Automatic transcription often struggles with names, acronyms, equations, code terms, and specialized vocabulary. A human review pass is essential before students depend on the captions.",
          "Use the editor to tighten long lines, correct punctuation, and keep captions synchronized with slides, demos, or screen recordings."
        ],
        table: {
          columns: ["Course type", "Common caption issue", "Review focus"],
          rows: [
            ["Software tutorials", "Code terms and UI labels", "Check commands, filenames, and product names"],
            ["Science lessons", "Formulas and terminology", "Correct symbols, units, and names"],
            ["Business training", "Acronyms and policy terms", "Match internal vocabulary"],
            ["Language courses", "Timing and punctuation", "Keep examples easy to follow"]
          ]
        }
      },
      {
        heading: "Course Captions, Transcripts, and Translation",
        body: [
          "A caption file can become more than an accessibility asset. Export TXT for lesson notes, translate the SRT for international cohorts, or reuse captions when cutting a lecture into short clips.",
          "Keep each lesson's source subtitle file organized so future corrections and translations do not require another transcription pass."
        ],
        links: [
          { label: "Translate course subtitles", href: "/subtitle-translator" },
          { label: "Transcribe podcast-style lessons", href: "/podcast-transcription" }
        ]
      }
    ],
    faq: [
      { question: "Can I generate captions for free?", answer: "You can start generating course captions for free. Large courses, long lectures, or paid export features may depend on current plan limits." },
      { question: "How accurate is the transcription for technical terms?", answer: "AI transcription is a strong first draft, but technical vocabulary needs human review. Correct formulas, acronyms, names, and product terms before publishing." },
      { question: "Can I export captions for Udemy?", answer: "You can export SRT or VTT files that are commonly used by course platforms. Always follow Udemy's current upload requirements when adding captions." },
      { question: "What languages are supported?", answer: `VideoToSRT is designed for 50+ language workflows, including ${languages}. Review translated or technical content before students see it.` },
      { question: "Can I edit captions for accuracy?", answer: "Yes. Editing is the key part of the workflow, especially for lectures with specialized vocabulary, slides, or demonstrations." },
      { question: "How do I add captions to Teachable?", answer: "Generate and export the subtitle file, then upload it through Teachable's current video or lesson caption controls." },
      { question: "Is there a limit on video length?", answer: "Plan limits and provider limits can apply. For a full course, check current pricing and limits before processing many long lectures." },
      { question: "Can I generate captions for live lectures?", answer: "VideoToSRT is best for recorded files or media links after the lecture. For live captioning, use a tool built specifically for real-time caption delivery." },
      { question: "Can I translate course captions?", answer: "Yes. Export or prepare an SRT, then use the subtitle translator workflow and review the translation before publishing it to students." }
    ],
    cta: {
      heading: "Generate Course Captions Now",
      body: "Upload a lecture, create a caption draft, and review the technical terms students need to understand.",
      primary: { label: "Upload Video - Free", href: "/#upload" },
      secondary: { label: "Translate Subtitles", href: "/subtitle-translator" }
    },
    links: [
      { label: "Podcast Transcription", href: "/podcast-transcription" },
      { label: "Video to SRT Converter", href: "/video-to-srt" },
      { label: "Subtitle Translator", href: "/subtitle-translator" },
      { label: "SRT Editor Online", href: "/srt-editor" }
    ]
  },
  "subtitle-translator": {
    path: "/subtitle-translator",
    metaTitle: "Translate Subtitles Online - SRT Translation",
    metaDescription: "Translate SRT files online, preserve timing, review AI subtitle translation, and export localized subtitles.",
    title: "Translate Subtitles Online - SRT Translation",
    eyebrow: "Subtitle localization",
    description: "Translate subtitles online when you need to reach viewers in another language without rebuilding timing from scratch. VideoToSRT supports an SRT translation workflow where you preserve timestamps, review each line, and export a localized subtitle file.",
    highlights: ["Translate SRT file workflows", "Preserve subtitle timing", "Review AI translation line by line", "Useful for YouTube, courses, podcasts, and clips"],
    howToName: "How to Translate SRT Files Online",
    howToSteps: [
      { title: "Upload Your SRT", body: "Start with a clean subtitle file so the translation has accurate timing and source text." },
      { title: "Select Target Language", body: "Choose the language you need for your audience." },
      { title: "Review and Edit Translation", body: "Check meaning, names, idioms, and line length before publishing." },
      { title: "Export Translated SRT", body: "Download the translated subtitle file with timing preserved." }
    ],
    sections: [
      {
        heading: "Why Translate Your Subtitles?",
        body: [
          "Subtitles make videos discoverable and useful beyond the original language. A subtitle translator can help creators localize YouTube videos, course lessons, product demos, podcast clips, and social content.",
          "The key is preserving timing. Translating plain text is not enough if every caption must still appear at the right moment in the video."
        ]
      },
      {
        heading: "How to Translate SRT Files Online",
        body: ["Use a clean source SRT, translate it, then review the result while keeping the timing structure intact."],
        steps: [
          { title: "Upload Your SRT", body: "Start from an edited subtitle file rather than an unreviewed transcript whenever possible." },
          { title: "Select Target Language", body: "Pick the language needed for your audience, client, or publishing platform." },
          { title: "Review and Edit Translation", body: "Fix names, idioms, line length, and terms that machine translation may miss." },
          { title: "Export Translated SRT", body: "Save a translated SRT for upload, distribution, or additional review." }
        ]
      },
      {
        heading: "Supported Languages",
        body: [
          `The workflow is designed around 50+ language support, including ${languages}.`,
          "For professional or regulated content, use AI translation as a draft and have a fluent reviewer approve the final subtitles."
        ],
        features: [
          { title: "European Languages", body: "Translate between common languages such as English, Spanish, French, German, Italian, Portuguese, and Dutch." },
          { title: "Asian Languages", body: "Prepare subtitle workflows for Chinese, Japanese, Korean, Hindi, and other supported languages." },
          { title: "Right-to-Left Review", body: "Check display behavior carefully for Arabic and other right-to-left languages." },
          { title: "Terminology Control", body: "Review brand names, product terms, and phrases that should not be translated literally." }
        ]
      },
      {
        heading: "Machine Translation vs. Human Review",
        body: [
          "AI can produce a fast subtitle translation draft, but subtitles have special constraints: short reading time, limited space, idioms, tone, and synchronized timing.",
          "Human review matters when the content includes humor, legal language, medical topics, education, brand terms, or high-stakes customer communication."
        ],
        table: {
          columns: ["Task", "AI subtitle translation", "Human review"],
          rows: [
            ["First draft", "Fast and useful", "Slower if done from scratch"],
            ["Idioms and tone", "Needs checking", "Best for nuance"],
            ["Timing preservation", "Keeps SRT structure", "Checks readability in context"],
            ["Publishing confidence", "Good start", "Recommended before final release"]
          ]
        }
      },
      {
        heading: "Where Translated Subtitles Help Most",
        body: [
          "Translate SRT to English for an international archive, localize course captions for students, create multilingual YouTube subtitle tracks, or prepare podcast clips for a new audience.",
          "If you do not yet have a source subtitle file, convert the video to SRT first, clean it, then translate the edited version."
        ],
        links: [
          { label: "Create the source SRT first", href: "/video-to-srt" },
          { label: "Edit SRT before translation", href: "/srt-editor" }
        ]
      }
    ],
    faq: [
      { question: "Can I translate subtitles for free?", answer: "You can start a subtitle translation workflow for free. Large files, repeated exports, or higher-volume use may depend on current plan limits." },
      { question: "How accurate is AI subtitle translation?", answer: "AI translation is useful for a first draft, but accuracy depends on language pair, context, idioms, and domain terms. Review before publishing." },
      { question: "What languages are supported?", answer: `VideoToSRT is designed for 50+ language workflows, including ${languages}. Availability can vary by provider and workflow.` },
      { question: "Can I translate SRT to VTT?", answer: "Use the subtitle translation workflow to localize the text, then export in the format supported by the current editor workflow, such as SRT or VTT." },
      { question: "Will the timing be preserved?", answer: "Yes. The goal of SRT translation is to preserve the subtitle timing while replacing the text with reviewed translated lines." },
      { question: "Can I translate multiple files at once?", answer: "Batch workflows may depend on the current plan and product limits. Confirm limits before processing many subtitle files." },
      { question: "How do I translate YouTube subtitles?", answer: "Export or create an SRT for the video, translate and review it, then upload the translated subtitle file through YouTube's subtitle tools." },
      { question: "Can I edit the translation before exporting?", answer: "Yes. Reviewing the translated lines is important because line length, names, tone, and idioms often need human correction." },
      { question: "Can I auto translate subtitles from a video?", answer: "First create an SRT from the video, then translate the cleaned SRT. This keeps transcription cleanup separate from translation review." }
    ],
    cta: {
      heading: "Translate Your Subtitles Now",
      body: "Start with a clean SRT, translate it, and review each line before publishing a localized subtitle file.",
      primary: { label: "Open Editor", href: "/editor" },
      secondary: { label: "Convert Video to SRT", href: "/video-to-srt" }
    },
    links: [
      { label: "SRT Editor Online", href: "/srt-editor" },
      { label: "Video to SRT Converter", href: "/video-to-srt" },
      { label: "Course Caption Generator", href: "/course-captions" },
      { label: "Podcast Transcription", href: "/podcast-transcription" }
    ]
  },
  "ass-subtitle-editor": {
    path: "/ass-subtitle-editor",
    metaTitle: "ASS Subtitle Editor Online - Styled Subtitles",
    metaDescription: "Understand ASS subtitle editing, styled subtitle workflows, ASS vs SRT, and when to use styled captions online.",
    title: "ASS Subtitle Editor Online - Styled Subtitles",
    eyebrow: "Styled subtitle workflow",
    description: "ASS and SSA subtitle files are used when captions need styling details such as font, color, position, and layout. VideoToSRT explains and supports the browser workflow around styled subtitles while keeping the source text editable.",
    highlights: ["ASS subtitle editor workflow", "Styled subtitle editor guidance", "ASS vs SRT comparison", "Useful before burn-in or short-form caption work"],
    howToName: "How to Edit ASS Subtitles Online",
    howToSteps: [
      { title: "Upload ASS and Video", body: "Start with a styled subtitle file and matching media when you need to review layout in context." },
      { title: "Edit Styles", body: "Plan font, color, placement, and readability without losing the subtitle text workflow." },
      { title: "Preview and Export", body: "Check the result before publishing or moving into a burn-in workflow supported by your plan." }
    ],
    sections: [
      {
        heading: "What Is an ASS Subtitle File?",
        body: [
          "ASS stands for Advanced SubStation Alpha. Unlike SRT, which mainly stores timestamps and text, ASS can include styling instructions for fonts, colors, positions, outlines, and other visual choices.",
          "Use ASS when caption appearance is part of the video experience. Use SRT when you need broad compatibility and simple subtitle tracks."
        ]
      },
      {
        heading: "How to Edit ASS Subtitles Online",
        body: ["Styled subtitles still need accurate text and timing. Treat the ASS editor online workflow as a combination of cleanup, design review, and export planning."],
        steps: [
          { title: "Upload ASS and Video", body: "Open the subtitle source with the matching media so text and placement can be checked together." },
          { title: "Edit Styles", body: "Review font, color, position, and contrast. Keep captions readable on the final viewing device." },
          { title: "Preview and Export", body: "Preview before committing to a styled or hardcoded output workflow." }
        ]
      },
      {
        heading: "ASS vs. SRT - When to Use Each Format",
        body: ["The best format depends on whether you need styling control or maximum compatibility."],
        table: {
          columns: ["Format", "Best for", "Tradeoff"],
          rows: [
            ["SRT", "Simple captions, platform uploads, translation", "Limited styling"],
            ["VTT", "Web players and browser caption tracks", "Less universal than SRT in some tools"],
            ["ASS/SSA", "Styled subtitles, positioning, visual caption design", "Less accepted by simple upload forms"],
            ["Burned captions", "One MP4 with permanent text", "Hard to edit after export"]
          ]
        }
      },
      {
        heading: "Styled Subtitle Features to Review",
        body: ["When editing ASS subtitles, focus on readability first. Style can support the content, but poor contrast or cluttered placement makes captions harder to use."],
        features: [
          { title: "Font and Size", body: "Choose a readable style that survives mobile viewing and compression." },
          { title: "Color and Outline", body: "Use contrast so captions remain visible over changing backgrounds." },
          { title: "Position", body: "Avoid covering faces, UI elements, or important visual information." },
          { title: "Timing", body: "Styled subtitles still need clean timing and readable line duration." }
        ]
      }
    ],
    faq: [
      { question: "What is an ASS file?", answer: "An ASS file is a styled subtitle format that can store text, timing, font, color, position, and layout instructions." },
      { question: "Can I edit ASS subtitles online?", answer: "VideoToSRT supports the browser workflow around styled subtitles and subtitle cleanup. Confirm current export support for your exact ASS workflow before client delivery." },
      { question: "What styling options are available?", answer: "ASS-style workflows commonly include font, size, color, outline, and position. Keep styles readable across mobile and desktop screens." },
      { question: "Can I convert ASS to SRT?", answer: "You can simplify styled subtitles into plain subtitle text when you need SRT compatibility, but style details will not carry into SRT." },
      { question: "Is the ASS editor free?", answer: "You can start subtitle workflows for free. Advanced style templates or export features may depend on current plan limits." },
      { question: "Can I preview ASS styles in real time?", answer: "Preview is important for styled captions because position and contrast affect readability. Check current editor behavior for the exact file and style features you need." },
      { question: "Should I use ASS for TikTok captions?", answer: "ASS can help plan styled caption appearance, but final social posts often need burned captions. Keep an editable subtitle source before export." },
      { question: "Is ASS better than SRT?", answer: "ASS is better for styling. SRT is better for simple compatibility, translation, and platform subtitle uploads." }
    ],
    cta: {
      heading: "Edit ASS Subtitles Now",
      body: "Prepare styled subtitle text, review readability, and keep a clean source before moving into permanent caption exports.",
      primary: { label: "Open Editor", href: "/editor" },
      secondary: { label: "Compare Burn-In", href: "/burn-subtitles" }
    },
    links: [
      { label: "SRT Editor Online", href: "/srt-editor" },
      { label: "Burn Subtitles into Video", href: "/burn-subtitles" },
      { label: "Short-form Subtitle Generator", href: "/short-form-subtitles" },
      { label: "Video to SRT Converter", href: "/video-to-srt" }
    ]
  },
  "public-url-subtitles": {
    path: "/public-url-subtitles",
    metaTitle: "Public URL Subtitle Editor - Auto-Generate and Edit",
    metaDescription: "Generate subtitles from a public video URL when you have permission, then edit and export SRT, VTT, or TXT.",
    title: "Public URL Subtitle Editor - Auto-Generate and Edit",
    eyebrow: "URL subtitle workflow",
    description: "Use a public URL subtitle editor when the source media is already online and you have permission to process it. Paste a public video URL, generate editable subtitles, clean the result, and export a subtitle file for your publishing workflow.",
    highlights: ["Generate subtitles from URL", "YouTube subtitle generator from URL workflow", "Subtitles from video link when permitted", "Edit and export SRT, VTT, or TXT"],
    howToName: "How to Generate Subtitles from a Public Video URL",
    howToSteps: [
      { title: "Paste the Video URL", body: "Use a public media link you have the rights to process." },
      { title: "AI Extracts Audio and Transcribes", body: "Create a timed transcript draft from the media source." },
      { title: "Edit and Export SRT", body: "Review the transcript, fix timing and text, then export SRT, VTT, or TXT." }
    ],
    sections: [
      {
        heading: "Generate Subtitles from Any Public Video URL",
        body: [
          "A URL subtitle generator saves time when the media is already hosted and you do not want a download-upload loop. It is useful for your own published videos, public training assets, approved client links, and other media you have permission to process.",
          "Rights matter. VideoToSRT is a subtitle workflow tool, not a way to bypass ownership, platform rules, or download restrictions."
        ]
      },
      {
        heading: "How It Works",
        body: ["The public URL workflow mirrors file transcription, but starts from a link instead of a local upload."],
        steps: [
          { title: "Paste the Video URL", body: "Provide the public video link and confirm you have the right to process the content." },
          { title: "AI Extracts Audio and Transcribes", body: "The app creates a timed subtitle draft from the media audio where supported." },
          { title: "Edit and Export SRT", body: "Clean text and timing in the editor, then export SRT, VTT, or TXT." }
        ]
      },
      {
        heading: "Supported URL Sources",
        body: [
          "URL workflows are intended for major public platforms and direct media links where processing is technically possible and permitted. Platform behavior can change, so treat URL import as a supported workflow rather than a guarantee for every link.",
          "If a URL cannot be processed, use a file upload for media you own or have permission to handle."
        ],
        features: [
          { title: "YouTube", body: "Use the workflow for your own videos or content you have permission to process." },
          { title: "Vimeo", body: "Public or accessible links may be suitable depending on permissions and platform behavior." },
          { title: "TikTok", body: "Short public clips can be candidates when rights and technical access allow." },
          { title: "Direct Video Links", body: "Direct media URLs are often the simplest source when available." }
        ]
      },
      {
        heading: "URL Import vs. File Upload",
        body: ["Choose the source method that gives you reliable access and the cleanest audio."],
        table: {
          columns: ["Method", "Best for", "Watch out for"],
          rows: [
            ["Public URL", "Hosted media you can process", "Platform restrictions or unavailable audio"],
            ["File upload", "Local source files and final edits", "Upload time and file limits"],
            ["Audio upload", "Podcasts, interviews, lectures", "No visual preview unless paired with video"],
            ["Existing SRT", "Cleanup, translation, or republishing", "Needs matching media for timing review"]
          ]
        }
      }
    ],
    faq: [
      { question: "Can I generate subtitles from a YouTube URL?", answer: "The URL workflow is intended for public video links where processing is permitted and technically available. Only process videos you own or have permission to use." },
      { question: "What video platforms are supported?", answer: "The product direction covers major public platforms and direct media links, but support can vary by platform behavior, access rules, and the specific URL." },
      { question: "Do I need to download the video?", answer: "A public URL workflow can avoid a download-upload loop when the link is supported. If not, upload a file you have the right to process." },
      { question: "Is URL subtitle generation free?", answer: "You can start subtitle workflows for free. Longer media, repeated use, or paid export features may depend on current plan limits." },
      { question: "How long does URL transcription take?", answer: "Processing time depends on media length, source access, audio extraction, transcription queue, and network conditions." },
      { question: "Can I edit subtitles before exporting?", answer: "Yes. The transcript should be reviewed in the editor before exporting SRT, VTT, or TXT." },
      { question: "Can I use a private video URL?", answer: "Private, restricted, or login-protected URLs may not work. Use public links or upload a file you are allowed to process." },
      { question: "Can I generate subtitles from a video link in another language?", answer: "Yes, when transcription supports the language and the audio is clear. Review the resulting subtitle file before publishing." }
    ],
    cta: {
      heading: "Try URL Subtitle Generator Now",
      body: "Start from a public link you have permission to process, then clean the generated subtitles before export.",
      primary: { label: "Start from Upload Area", href: "/#upload" },
      secondary: { label: "Open SRT Editor", href: "/srt-editor" }
    },
    links: [
      { label: "Video to SRT Converter", href: "/video-to-srt" },
      { label: "SRT Editor Online", href: "/srt-editor" },
      { label: "Podcast Transcription", href: "/podcast-transcription" },
      { label: "Subtitle Translator", href: "/subtitle-translator" }
    ]
  }
} satisfies Record<LandingPageKey, LandingPageDefinition>;

export function getLandingPage(key: LandingPageKey) {
  return landingPages[key];
}

export function createLandingMetadata(page: LandingPageDefinition): Metadata {
  return createPageMetadata({
    path: page.path,
    title: page.metaTitle,
    description: page.metaDescription
  });
}

export function createLandingJsonLd(page: LandingPageDefinition) {
  const extraNodes: Array<Record<string, unknown>> = [
    createSoftwareApplicationJsonLd({
      name: page.title,
      description: page.metaDescription,
      url: `${siteUrl}${page.path}`
    }),
    createFaqJsonLd(page.faq),
    createBreadcrumbJsonLd({ path: page.path, name: page.title })
  ];

  if (page.howToName && page.howToSteps?.length) {
    extraNodes.push(createHowToJsonLd({ name: page.howToName, steps: page.howToSteps }));
  }

  return createPageJsonLd({
    path: page.path,
    name: page.title,
    description: page.metaDescription,
    extraNodes
  });
}

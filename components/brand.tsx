import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-[11px] whitespace-nowrap text-lg font-extrabold">
      <span className="brand-mark">VS</span>
      <span>VideoToSRT</span>
    </Link>
  );
}

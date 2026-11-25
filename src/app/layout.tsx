import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "정비노트 — 철도 차량 정비 지식 플랫폼 (가상 데이터)",
  description: "고장 조치 보고서를 부서·차량·부품별로 보고, AI로 유사 사례를 찾고 보고서 초안을 작성합니다. 모든 데이터는 가상입니다.",
};

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/reports", label: "보고서" },
  { href: "/search", label: "유사 사례 검색" },
  { href: "/reports/new", label: "보고서 작성" },
  { href: "/departments", label: "부서·차량·부품" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="bg-[#0b3d91] text-white">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/" className="font-bold text-lg tracking-tight">
              🚆 정비노트 <span className="ml-1 text-xs font-normal opacity-75">대전철도차량정비단 · 가상 데이터</span>
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 hover:bg-white/15">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          AI 자동화 수업 프로젝트 · 모든 부서·차량·보고서 데이터는 가상이며 실제 코레일 데이터가 아닙니다.
        </footer>
      </body>
    </html>
  );
}

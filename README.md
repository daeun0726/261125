# 정비노트 — 철도 차량 정비 지식 플랫폼 (AI 자동화 수업 프로젝트)

고장 조치 보고서를 부서·차량·부품별로 모아 보고, AI로 유사 사례를 찾고 보고서 초안을 작성하는 웹 서비스입니다.
**모든 부서·차량·보고서 데이터는 가상이며 실제 코레일 데이터가 아닙니다.**

## 기능
- 대시보드: 부서·장치별 보고서 수, 월별 추이, 반복 고장, 교체가 많은 부품
- 보고서 목록·상세: 부서/차종/차량/장치/부품/기간 필터, 보고서 양식 보기, 비슷한 과거 보고서
- 유사 사례 검색: 증상을 평소 말투로 입력 → 임베딩 검색 + Gemini가 3건 추천과 점검 순서 제안
- 보고서 작성: 정비 메모 → Gemini가 과거 보고서를 참고해 양식에 맞는 초안 작성 → 저장
- 부서·차량·부품 페이지: 차량 이력 타임라인과 AI 이력 요약, 부품 교체 이력

## 기술 스택
Next.js 16 (App Router, TypeScript) · Tailwind CSS · Recharts · Supabase (PostgreSQL + pgvector) · Google Gemini API (무료 등급) · Vercel

## 실행
```bash
npm install
cp docs/env.example .env.local   # 값 채우기
npm run dev
```
DB 테이블과 가상 데이터는 `docs/setup.sql`을 Supabase SQL Editor에서 실행해 만듭니다.
Gemini 키를 넣은 뒤 대시보드 하단의 **검색용 벡터 만들기**를 한 번 눌러야 AI 유사 사례 검색이 동작합니다.

# Playwright E2E 테스트 학습 가이드

서버 개발자를 위한 Playwright 입문 교육 자료입니다.

**교육 목표**: Playwright를 활용해 담당 웹 서비스의 E2E 테스트를 직접 작성할 수 있다.

---

## 교육 목차

| # | 주제 | 핵심 내용 | 실습 코드 |
|---|------|----------|----------|
| 01 | [Playwright 소개](./docs/01-introduction.md) | E2E 테스트의 필요성, 다른 도구와 비교 | - |
| 02 | [설치와 프로젝트 설정](./docs/02-installation.md) | 프로젝트 구조, 설정 파일, CLI 옵션 | [`playwright.config.ts`](./playwright.config.ts) |
| 03 | [첫 번째 테스트](./docs/03-first-test.md) | 테스트 파일 구조, 훅, 자동 대기 | [`tests/01-basics/`](./tests/01-basics/) |
| 04 | [로케이터](./docs/04-locators.md) | getByRole, getByLabel, getByText 등 | [`tests/02-locators/`](./tests/02-locators/) |
| 05 | [액션과 어서션](./docs/05-actions-assertions.md) | 클릭/입력/키보드, 다양한 검증 방법 | [`tests/03-actions/`](./tests/03-actions/), [`tests/04-assertions/`](./tests/04-assertions/) |
| 06 | [페이지 오브젝트 모델](./docs/06-page-object-model.md) | POM 패턴으로 테스트 코드 구조화 | [`pages/TodoPage.ts`](./pages/TodoPage.ts), [`tests/05-page-objects/`](./tests/05-page-objects/) |
| 07 | [API 테스트](./docs/07-api-testing.md) | REST API 직접 검증, UI+API 조합 패턴 | [`tests/06-api/`](./tests/06-api/) |
| 08 | [인증 처리](./docs/08-authentication.md) | storageState, 다중 역할 사용자 테스트 | [`tests/07-auth/`](./tests/07-auth/) |
| 09 | [고급 패턴](./docs/09-advanced-patterns.md) | 커스텀 픽스처, 네트워크 모킹, 병렬 실행 | [`fixtures/`](./fixtures/), [`tests/08-fixtures/`](./tests/08-fixtures/) |
| 10 | [CI/CD 통합](./docs/10-ci-cd.md) | GitHub Actions 설정, 테스트 계층화 | - |

---

## 빠른 시작

### 1. 의존성 설치

```bash
npm install
npx playwright install chromium
```

### 2. 테스트 실행

```bash
# 전체 테스트
npm test

# UI 모드 (시각적으로 확인하며 학습)
npm run test:ui

# 챕터별 실습
npm run test:basics      # 01 기본 네비게이션
npm run test:locators    # 02 로케이터
npm run test:actions     # 03 액션
npm run test:assertions  # 04 어서션
npm run test:page-objects # 05 POM 패턴
npm run test:api         # 06 API 테스트
npm run test:auth        # 07 인증 처리
npm run test:fixtures    # 08 커스텀 픽스처
```

### 3. 결과 확인

```bash
# HTML 리포트 열기
npm run test:report
```

---

## 프로젝트 구조

```
hello-playwright/
├── playwright.config.ts     # Playwright 전체 설정
├── tsconfig.json
│
├── tests/                   # 챕터별 실습 코드
│   ├── 01-basics/           # 기본 네비게이션
│   ├── 02-locators/         # 로케이터 전략
│   ├── 03-actions/          # 폼 액션
│   ├── 04-assertions/       # 어서션
│   ├── 05-page-objects/     # POM 패턴
│   ├── 06-api/              # API 테스트
│   ├── 07-auth/             # 인증 처리
│   └── 08-fixtures/         # 커스텀 픽스처
│
├── pages/                   # 페이지 오브젝트
│   └── TodoPage.ts
│
├── fixtures/                # 커스텀 픽스처
│   └── custom-fixtures.ts
│
└── docs/                    # 교육 문서 (01~10)
```

---

## 실습 대상 서비스

| 서비스 | URL | 사용 챕터 |
|--------|-----|----------|
| TodoMVC | https://demo.playwright.dev/todomvc | 02, 03, 04, 05, 06 |
| JSONPlaceholder | https://jsonplaceholder.typicode.com | 07 |
| Expand Testing (Practice) | https://practice.expandtesting.com | 07, 08 |

---

## 유용한 명령어

```bash
# 코드 자동 생성 (브라우저 조작을 코드로 변환)
npx playwright codegen https://demo.playwright.dev/todomvc

# 특정 테스트만 실행
npx playwright test -g "GET /posts"

# 단계별 디버그
npx playwright test --debug

# 실패한 테스트만 재실행
npx playwright test --last-failed
```

# 08. 인증 처리 (Authentication)

로그인이 필요한 서비스를 테스트할 때 인증 처리는 필수입니다. Playwright는 여러 가지 방법으로 인증을 처리합니다.

> 실습 파일: [`tests/07-auth/auth.spec.ts`](../tests/07-auth/auth.spec.ts)

## 인증 전략 비교

| 전략 | 방법 | 속도 | 적합한 경우 |
|------|------|------|------------|
| storageState | 로그인 상태를 파일로 저장 후 재사용 | 빠름 | 대부분의 경우 (권장) |
| 매 테스트마다 로그인 | beforeEach에서 로그인 수행 | 느림 | 로그인 자체를 테스트할 때 |
| API 토큰 주입 | 쿠키/헤더 직접 설정 | 매우 빠름 | JWT, API 키 기반 인증 |
| HTTP 기본 인증 | request.get 옵션으로 처리 | 매우 빠름 | HTTP Basic Auth |

## 전략 1: storageState (권장)

로그인 후 브라우저의 쿠키와 localStorage를 파일로 저장하고, 이후 테스트에서 재사용하는 방법입니다.

### 인증 상태 저장

```typescript
// tests/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 로그인 수행
  await page.goto('https://myservice.com/login');
  await page.getByLabel('이메일').fill('admin@example.com');
  await page.getByLabel('비밀번호').fill('password123');
  await page.getByRole('button', { name: '로그인' }).click();

  // 로그인 성공 확인
  await page.waitForURL('/dashboard');

  // 인증 상태 파일로 저장
  await page.context().storageState({ path: '.auth/user.json' });

  await browser.close();
}

export default globalSetup;
```

### playwright.config.ts에서 글로벌 설정 적용

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: './tests/global-setup.ts',

  projects: [
    // 인증이 필요 없는 테스트
    {
      name: 'public',
      testMatch: 'tests/public/**/*.spec.ts',
    },
    // 인증이 필요한 테스트
    {
      name: 'authenticated',
      testMatch: 'tests/authenticated/**/*.spec.ts',
      use: {
        storageState: '.auth/user.json',  // 저장된 인증 상태 사용
      },
    },
  ],
});
```

### 인증된 상태로 테스트 실행

```typescript
// storageState를 설정한 프로젝트에서 실행되는 테스트
test('대시보드 접근', async ({ page }) => {
  // 이미 로그인된 상태 - 로그인 코드 없어도 됨
  await page.goto('/dashboard');
  await expect(page.getByRole('heading')).toContainText('대시보드');
});
```

### 특정 테스트 블록에만 storageState 적용

```typescript
test.describe('관리자 기능', () => {
  test.use({ storageState: '.auth/admin.json' });

  test('사용자 목록 관리', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('table')).toBeVisible();
  });
});
```

### ⚠️ fullyParallel + test.use({ storageState }) 주의사항

`fullyParallel: true` 환경에서 `test.use({ storageState })`를 `describe` 블록 안에 선언하면, **같은 스코프의 `beforeAll` 내 `browser.newContext()`에도 `storageState` 설정이 적용**됩니다. 파일이 아직 없는 시점에 읽으려 하면 `ENOENT` 에러가 발생합니다.

```typescript
// ❌ 잘못된 패턴 - fullyParallel 환경에서 ENOENT 에러 발생
test.describe('인증 테스트', () => {
  test.use({ storageState: '.auth/user.json' });  // ← beforeAll에도 영향

  test.beforeAll(async ({ browser }) => {  // ← browser 픽스처 = test.use() 적용 대상
    const context = await browser.newContext();  // 아직 없는 파일을 읽으려 함 → ENOENT!
    // ...
  });
});

// ✅ 올바른 패턴 - newContext()에 storageState 키를 명시적으로 지정
const STORAGE_STATE_PATH = '.auth/user.json';

test.beforeAll(async ({ playwright }) => {
  const browser = await playwright.chromium.launch();
  // storageState 키를 명시해야 test.use()의 storageState가 주입되지 않음
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto('/login');
  // ... 로그인 수행 ...
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
});

test.describe('인증 테스트', () => {
  test.use({ storageState: STORAGE_STATE_PATH });  // beforeAll 완료 후 안전하게 사용

  test('보안 페이지 접근', async ({ page }) => {
    await page.goto('/secure');
    await expect(page.locator('h1')).toContainText('Secure Area');
  });
});
```

> **함정**: `playwright.chromium.launch()`로 직접 띄운 브라우저도 픽스처 시스템을 완전히 우회하지 못한다. Playwright는 테스트 실행 중 생성되는 **모든** `newContext()` 호출에 `test.use()` 옵션을 주입한다(옵션 객체에 없는 키만 채움). 그래서 `.auth/user.json`이 이전 실행에서 남아 있으면 로그인된 세션이 로드되어 `/login` 폼이 렌더링되지 않고 타임아웃이 발생하며, 파일이 없으면 `ENOENT`가 발생한다.
>
> **핵심 원칙**: storageState 파일을 만드는 컨텍스트는 `newContext({ storageState: undefined })`처럼 키를 명시해 항상 빈 상태에서 로그인한다.

## 전략 2: 각 테스트마다 로그인

로그인 플로우 자체를 테스트하거나, 다양한 계정으로 테스트가 필요한 경우입니다.

```typescript
test.describe('로그인 시나리오', () => {
  test('올바른 자격증명으로 로그인', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('user@example.com');
    await page.getByLabel('비밀번호').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    // 로그인 성공: 대시보드로 이동
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('환영합니다')).toBeVisible();
  });

  test('잘못된 비밀번호로 로그인 실패', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('user@example.com');
    await page.getByLabel('비밀번호').fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    // 에러 메시지 확인
    await expect(page.getByRole('alert')).toContainText('이메일 또는 비밀번호가 올바르지 않습니다');
    // 로그인 페이지에 머물러 있음
    await expect(page).toHaveURL('/login');
  });

  test('로그아웃', async ({ page }) => {
    // 로그인 (storageState 또는 직접 로그인)
    await page.goto('/login');
    await page.getByLabel('이메일').fill('user@example.com');
    await page.getByLabel('비밀번호').fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    // 로그아웃
    await page.getByRole('button', { name: '로그아웃' }).click();

    // 로그인 페이지로 이동
    await expect(page).toHaveURL('/login');

    // 보안 페이지 접근 불가 확인
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');  // 리다이렉트됨
  });
});
```

## 전략 3: API로 토큰 받아 쿠키 설정

JWT 기반 인증에서 가장 빠른 방법입니다.

```typescript
test.beforeEach(async ({ page, request }) => {
  // 1. 로그인 API 호출로 토큰 획득
  const response = await request.post('/api/auth/login', {
    data: { email: 'user@example.com', password: 'password123' },
  });
  const { accessToken, refreshToken } = await response.json();

  // 2. 쿠키로 토큰 설정 (브라우저 쿠키 인증 방식)
  await page.context().addCookies([
    {
      name: 'access_token',
      value: accessToken,
      domain: 'localhost',
      path: '/',
    },
  ]);

  // 3. 또는 localStorage에 토큰 저장 (localStorage 기반 인증)
  await page.goto('/');  // 페이지 컨텍스트 초기화를 위해 한 번 방문
  await page.evaluate((token) => {
    localStorage.setItem('access_token', token);
  }, accessToken);
});

test('인증된 사용자 대시보드', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading')).toContainText('대시보드');
});
```

## 전략 4: HTTP 기본 인증 (Basic Auth)

```typescript
test('HTTP Basic Auth', async ({ page }) => {
  // URL에 자격증명 포함
  await page.goto('https://user:password@httpbin.org/basic-auth/user/password');

  // 또는 컨텍스트 레벨에서 설정
  const context = await browser.newContext({
    httpCredentials: {
      username: 'user',
      password: 'password',
    },
  });
  const page = await context.newPage();
  await page.goto('https://httpbin.org/basic-auth/user/password');
});
```

## 여러 역할(Role)의 사용자 테스트

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: './tests/global-setup.ts',

  projects: [
    {
      name: 'admin',
      use: { storageState: '.auth/admin.json' },
      testMatch: 'tests/admin/**/*.spec.ts',
    },
    {
      name: 'user',
      use: { storageState: '.auth/user.json' },
      testMatch: 'tests/user/**/*.spec.ts',
    },
  ],
});

// tests/global-setup.ts
async function globalSetup() {
  // 관리자 로그인 상태 저장
  await saveStorageState('.auth/admin.json', 'admin@example.com', 'adminpass');
  // 일반 사용자 로그인 상태 저장
  await saveStorageState('.auth/user.json', 'user@example.com', 'userpass');
}

async function saveStorageState(path: string, email: string, password: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('/login');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path });
  await browser.close();
}
```

## .gitignore에 인증 파일 추가

```gitignore
# .gitignore
.auth/
playwright-report/
test-results/
```

## 실습 코드 실행

```bash
# 인증 처리 실습 실행
npm run test:auth

# UI 모드로 확인
npx playwright test tests/07-auth --ui
```

---

| | |
|---|---|
| 이전 문서 | [← 07. API 테스트](./07-api-testing.md) |
| 다음 문서 | [09. 고급 패턴 →](./09-advanced-patterns.md) |

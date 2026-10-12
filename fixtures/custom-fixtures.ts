import { test as base, Page, APIRequestContext } from '@playwright/test';
import { TodoPage } from '../pages/TodoPage';

/**
 * 커스텀 픽스처 (Custom Fixtures)
 *
 * 목표: 반복되는 테스트 설정을 픽스처로 추출하는 방법을 익힌다.
 *
 * 픽스처란?
 * - 테스트에 필요한 리소스(객체, 데이터, 상태)를 미리 준비하는 메커니즘
 * - beforeEach/afterEach 보다 명확하고 재사용 가능
 * - Playwright에서 기본 제공: page, browser, context, request 등
 * - 커스텀 픽스처로 프로젝트 특화 설정 추가 가능
 */

// 커스텀 픽스처 타입 정의
type CustomFixtures = {
  todoPage: TodoPage;
  authenticatedPage: Page;
  apiClient: APIRequestContext;
  todoPageWithItems: TodoPage;
};

// 기본 test를 확장하여 커스텀 픽스처 추가
export const test = base.extend<CustomFixtures>({
  /**
   * todoPage 픽스처
   * - TodoPage 인스턴스를 자동으로 생성하고 페이지로 이동
   */
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // 테스트에 픽스처 제공
    await use(todoPage);

    // 테스트 종료 후 정리 (필요시)
    // await page.close();
  },

  /**
   * todoPageWithItems 픽스처
   * - 기본 할 일 항목들이 추가된 상태의 TodoPage 제공
   */
  todoPageWithItems: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // 기본 데이터 준비
    await todoPage.addTodos([
      'API 설계',
      '단위 테스트 작성',
      'E2E 테스트 작성',
      '코드 리뷰 요청',
    ]);

    await use(todoPage);
  },

  /**
   * apiClient 픽스처
   * - 특정 baseURL과 헤더가 설정된 APIRequestContext 제공
   */
  apiClient: async ({ playwright }, use) => {
    const apiContext = await playwright.request.newContext({
      baseURL: 'https://jsonplaceholder.typicode.com',
      extraHTTPHeaders: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    await use(apiContext);

    // 테스트 종료 후 컨텍스트 정리
    await apiContext.dispose();
  },

  /**
   * authenticatedPage 픽스처
   * - 로그인된 상태의 페이지 제공
   * (실제 서비스에서는 로그인 로직 구현)
   */
  authenticatedPage: async ({ page }, use) => {
    // 로그인 수행
    await page.goto('https://practice.expandtesting.com/login');
    await page.getByLabel('Username').fill('practice');
    await page.getByLabel('Password').fill('SuperSecretPassword!');
    await page.getByRole('button', { name: 'Login' }).click();
    // 로그인 완료(보안 페이지 리다이렉트)까지 대기 후 페이지 제공
    await page.waitForURL('**/secure');

    await use(page);
  },
});

// expect도 함께 re-export
export { expect } from '@playwright/test';

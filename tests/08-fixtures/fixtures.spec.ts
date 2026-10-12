import { test, expect } from '../../fixtures/custom-fixtures';

/**
 * 08. 커스텀 픽스처 활용
 *
 * 목표: 커스텀 픽스처를 활용하여 테스트 설정을 간결하게 만드는 방법을 익힌다.
 *
 * fixtures/custom-fixtures.ts에서 정의한 픽스처들을 사용합니다.
 */

test.describe('커스텀 픽스처 활용', () => {
  test('todoPage 픽스처 - 자동으로 페이지 이동됨', async ({ todoPage }) => {
    // 픽스처가 자동으로 TodoPage 인스턴스를 생성하고 페이지 이동까지 처리
    // beforeEach 불필요!
    await todoPage.addTodo('픽스처로 추가한 할 일');
    await todoPage.expectTodoVisible('픽스처로 추가한 할 일');
  });

  test('todoPageWithItems 픽스처 - 초기 데이터 포함', async ({ todoPageWithItems }) => {
    // 이미 4개의 할 일이 준비된 상태로 시작
    await todoPageWithItems.expectTodoCount(4);
    await todoPageWithItems.expectTodoVisible('API 설계');
    await todoPageWithItems.expectTodoVisible('E2E 테스트 작성');
  });

  test('apiClient 픽스처 - 설정된 API 클라이언트 사용', async ({ apiClient }) => {
    // baseURL과 헤더가 미리 설정된 API 클라이언트 사용
    const response = await apiClient.get('/posts/1');

    expect(response.status()).toBe(200);

    const post = await response.json();
    expect(post).toHaveProperty('id', 1);
    expect(post).toHaveProperty('title');
  });

  test('여러 픽스처 조합 사용', async ({ todoPage, apiClient }) => {
    // 여러 픽스처를 동시에 사용
    // API에서 데이터 조회
    const response = await apiClient.get('/todos/1');
    const apiTodo = await response.json();

    // UI에서 할 일 추가
    await todoPage.addTodo(apiTodo.title);
    await todoPage.expectTodoVisible(apiTodo.title);
  });

  test('authenticatedPage 픽스처 - 로그인된 상태', async ({ authenticatedPage }) => {
    // 이미 로그인된 상태의 페이지
    await authenticatedPage.goto('https://practice.expandtesting.com/secure');
    await expect(authenticatedPage.locator('h1')).toContainText('Secure Area');
  });
});

/**
 * 픽스처 vs beforeEach 비교
 *
 * [beforeEach 방식 - 반복적이고 결합도 높음]
 * test.beforeEach(async ({ page }) => {
 *   const todoPage = new TodoPage(page);
 *   await todoPage.goto();
 *   // page를 test에 전달할 방법이 제한적
 * });
 *
 * [픽스처 방식 - 선언적이고 재사용 가능]
 * test('...', async ({ todoPage }) => {
 *   // todoPage가 자동으로 준비됨
 * });
 */

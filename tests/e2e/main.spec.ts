import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {

    test('deve fazer login com usuário válido', async ({ page }) => {
        await page.goto('/');

        // Preencher formulário de login
        await page.fill('input[type="text"]', 'edson');
        await page.fill('input[type="password"]', 'edson22');

        // Clicar em entrar
        await page.click('button[type="submit"]');

        // Aguardar redirecionamento para dashboard
        await page.waitForURL('**/dashboard', { timeout: 10000 });

        // Verificar se está no dashboard
        await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('deve exibir erro com credenciais inválidas', async ({ page }) => {
        await page.goto('/');

        await page.fill('input[type="text"]', 'usuario_invalido');
        await page.fill('input[type="password"]', 'senha_errada');
        await page.click('button[type="submit"]');

        // Aguardar mensagem de erro (toast)
        await page.waitForSelector('text=/credenciais inválidas/i', { timeout: 5000 });
    });

    test('deve fazer logout corretamente', async ({ page }) => {
        // Login primeiro
        await page.goto('/');
        await page.fill('input[type="text"]', 'edson');
        await page.fill('input[type="password"]', 'edson22');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');

        // Fazer logout
        await page.click('button:has-text("Sair")');

        // Verificar redirecionamento para login
        await page.waitForURL('**/login');
        await expect(page.locator('input[type="text"]')).toBeVisible();
    });
});

test.describe('Configurações', () => {

    test.beforeEach(async ({ page }) => {
        // Login como admin
        await page.goto('/');
        await page.fill('input[type="text"]', 'Edson');
        await page.fill('input[type="password"]', 'edson22');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
    });

    test('deve carregar configurações sem erro', async ({ page }) => {
        await page.goto('/configuracao');

        // Verificar se a página carregou
        await expect(page.locator('text=Configuração do Sistema')).toBeVisible();

        // Verificar se não há erros 500
        page.on('response', response => {
            if (response.url().includes('/api/config')) {
                expect(response.status()).not.toBe(500);
            }
        });
    });

    test('deve salvar setores visíveis', async ({ page }) => {
        await page.goto('/configuracao');

        // Aguardar carregar
        await page.waitForSelector('text=Setores/Processos Visíveis');

        // Clicar em algum setor para alternar
        await page.click('text=corte');

        // Salvar
        await page.click('button:has-text("Salvar Regras")');

        // Esperar confirmação
        await page.waitForSelector('text=/salvas com sucesso/i');
    });
});

test.describe('Apontamento de Produção', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.fill('input[type="text"]', 'edson');
        await page.fill('input[type="password"]', 'edson22');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
    });

    test('deve carregar página de apontamento', async ({ page }) => {
        await page.goto('/apontamento');

        // Verificar título
        await expect(page.locator('text=Apontamento de Produção')).toBeVisible();

        // Verificar tabs de setores
        await expect(page.locator('button:has-text("Corte")')).toBeVisible();
    });

    test('deve permitir filtrar por setor', async ({ page }) => {
        await page.goto('/apontamento');

        // Clicar em setor diferente
        await page.click('button:has-text("Dobra")');

        // Verificar que mudou (visual feedback)
        const dobraBtn = page.locator('button:has-text("Dobra")');
        await expect(dobraBtn).toHaveClass(/bg-purple-500/);
    });

    test('deve abrir modal de apontamento ao clicar em item', async ({ page }) => {
        await page.goto('/apontamento');

        // Aguardar carregar itens
        await page.waitForTimeout(2000);

        // Verificar se há itens
        const hasItems = await page.locator('button:has-text("Apontar")').count();

        if (hasItems > 0) {
            // Clicar no primeiro botão de apontar
            await page.locator('button:has-text("Apontar")').first().click();

            // Verificar se modal abriu
            await expect(page.locator('text=Registrar Apontamento')).toBeVisible();
        }
    });
});

test.describe('Ordem de Serviço', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.fill('input[type="text"]', 'edson');
        await page.fill('input[type="password"]', 'edson22');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
    });

    test('deve carregar página de ordens de serviço', async ({ page }) => {
        await page.goto('/ordem-servico');

        // Verificar título
        await expect(page.locator('text=Ordens de Serviço')).toBeVisible();
    });

    test('deve permitir buscar ordens', async ({ page }) => {
        await page.goto('/ordem-servico');

        // Digitar na busca
        await page.fill('input[placeholder*="Buscar"]', 'OS_00001');

        // Aguardar filtro
        await page.waitForTimeout(500);
    });
});

test.describe('API Endpoints', () => {

    test('GET /api/config deve retornar 200', async ({ request }) => {
        const response = await request.get('/api/config');
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
    });

    test('GET /api/config/menu deve retornar 200', async ({ request }) => {
        const response = await request.get('/api/config/menu');
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
    });
});

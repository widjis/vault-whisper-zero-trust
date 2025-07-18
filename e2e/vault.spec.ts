import { test, expect, Page } from '@playwright/test';

// Page Object Model for Vault Application
class VaultPage {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/');
  }

  // Authentication
  async signIn(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="sign-in-button"]');
    await this.page.waitForSelector('[data-testid="vault-dashboard"]');
  }

  async signOut() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="sign-out-button"]');
    await this.page.waitForSelector('[data-testid="sign-in-form"]');
  }

  // Entry Management
  async createEntry(entryData: {
    title: string;
    username?: string;
    password: string;
    url?: string;
    notes?: string;
    tags?: string[];
  }) {
    await this.page.click('[data-testid="add-entry-button"]');
    await this.page.waitForSelector('[data-testid="entry-form"]');

    await this.page.fill('[data-testid="title-input"]', entryData.title);
    await this.page.fill('[data-testid="password-input"]', entryData.password);

    if (entryData.username) {
      await this.page.fill('[data-testid="username-input"]', entryData.username);
    }

    if (entryData.url) {
      await this.page.fill('[data-testid="url-input"]', entryData.url);
    }

    if (entryData.notes) {
      await this.page.fill('[data-testid="notes-input"]', entryData.notes);
    }

    if (entryData.tags) {
      for (const tag of entryData.tags) {
        await this.page.fill('[data-testid="tag-input"]', tag);
        await this.page.click('[data-testid="add-tag-button"]');
      }
    }

    await this.page.click('[data-testid="save-entry-button"]');
    await this.page.waitForSelector('[data-testid="entry-form"]', { state: 'hidden' });
  }

  async editEntry(entryTitle: string, updates: Partial<{
    title: string;
    username: string;
    password: string;
    url: string;
    notes: string;
  }>) {
    await this.selectEntry(entryTitle);
    await this.page.click('[data-testid="edit-entry-button"]');
    await this.page.waitForSelector('[data-testid="entry-form"]');

    if (updates.title) {
      await this.page.fill('[data-testid="title-input"]', updates.title);
    }
    if (updates.username) {
      await this.page.fill('[data-testid="username-input"]', updates.username);
    }
    if (updates.password) {
      await this.page.fill('[data-testid="password-input"]', updates.password);
    }
    if (updates.url) {
      await this.page.fill('[data-testid="url-input"]', updates.url);
    }
    if (updates.notes) {
      await this.page.fill('[data-testid="notes-input"]', updates.notes);
    }

    await this.page.click('[data-testid="save-entry-button"]');
    await this.page.waitForSelector('[data-testid="entry-form"]', { state: 'hidden' });
  }

  async deleteEntry(entryTitle: string) {
    await this.selectEntry(entryTitle);
    await this.page.click('[data-testid="delete-entry-button"]');
    await this.page.click('[data-testid="confirm-delete-button"]');
  }

  async selectEntry(entryTitle: string) {
    await this.page.click(`[data-testid="entry-card"][data-title="${entryTitle}"]`);
  }

  async searchEntries(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.waitForTimeout(500); // Wait for debounced search
  }

  async filterByTag(tag: string) {
    await this.page.click('[data-testid="filter-menu"]');
    await this.page.click(`[data-testid="tag-filter"][data-tag="${tag}"]`);
  }

  // Assertions
  async expectEntryExists(entryTitle: string) {
    await expect(this.page.locator(`[data-testid="entry-card"][data-title="${entryTitle}"]`)).toBeVisible();
  }

  async expectEntryNotExists(entryTitle: string) {
    await expect(this.page.locator(`[data-testid="entry-card"][data-title="${entryTitle}"]`)).not.toBeVisible();
  }

  async expectEntryCount(count: number) {
    await expect(this.page.locator('[data-testid="entry-card"]')).toHaveCount(count);
  }

  async expectSignedIn() {
    await expect(this.page.locator('[data-testid="vault-dashboard"]')).toBeVisible();
  }

  async expectSignedOut() {
    await expect(this.page.locator('[data-testid="sign-in-form"]')).toBeVisible();
  }

  // Utility methods
  async copyPassword(entryTitle: string) {
    await this.selectEntry(entryTitle);
    await this.page.click('[data-testid="copy-password-button"]');
  }

  async togglePasswordVisibility(entryTitle: string) {
    await this.selectEntry(entryTitle);
    await this.page.click('[data-testid="toggle-password-visibility"]');
  }

  async toggleFavorite(entryTitle: string) {
    await this.selectEntry(entryTitle);
    await this.page.click('[data-testid="toggle-favorite-button"]');
  }

  async generatePassword() {
    await this.page.click('[data-testid="generate-password-button"]');
  }

  async getPasswordStrength() {
    return await this.page.textContent('[data-testid="password-strength"]');
  }
}

// Test Data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

const testEntry = {
  title: 'Test Entry',
  username: 'testuser@example.com',
  password: 'EntryPassword123!',
  url: 'https://example.com',
  notes: 'This is a test entry',
  tags: ['work', 'important'],
};

test.describe('Vault E2E Tests', () => {
  let vaultPage: VaultPage;

  test.beforeEach(async ({ page }) => {
    vaultPage = new VaultPage(page);
    await vaultPage.goto();
  });

  test.describe('Authentication', () => {
    test('should sign in and sign out successfully', async () => {
      await vaultPage.signIn(testUser.email, testUser.password);
      await vaultPage.expectSignedIn();

      await vaultPage.signOut();
      await vaultPage.expectSignedOut();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await vaultPage.signIn('invalid@example.com', 'wrongpassword');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('should persist session across page reloads', async ({ page }) => {
      await vaultPage.signIn(testUser.email, testUser.password);
      await vaultPage.expectSignedIn();

      await page.reload();
      await vaultPage.expectSignedIn();
    });
  });

  test.describe('Entry Management', () => {
    test.beforeEach(async () => {
      await vaultPage.signIn(testUser.email, testUser.password);
    });

    test('should create a new entry', async () => {
      await vaultPage.createEntry(testEntry);
      await vaultPage.expectEntryExists(testEntry.title);
    });

    test('should edit an existing entry', async () => {
      await vaultPage.createEntry(testEntry);
      
      const updatedTitle = 'Updated Test Entry';
      await vaultPage.editEntry(testEntry.title, { title: updatedTitle });
      
      await vaultPage.expectEntryExists(updatedTitle);
      await vaultPage.expectEntryNotExists(testEntry.title);
    });

    test('should delete an entry', async () => {
      await vaultPage.createEntry(testEntry);
      await vaultPage.expectEntryExists(testEntry.title);

      await vaultPage.deleteEntry(testEntry.title);
      await vaultPage.expectEntryNotExists(testEntry.title);
    });

    test('should search entries', async () => {
      await vaultPage.createEntry(testEntry);
      await vaultPage.createEntry({
        ...testEntry,
        title: 'Another Entry',
      });

      await vaultPage.searchEntries('Test');
      await vaultPage.expectEntryExists(testEntry.title);
      await vaultPage.expectEntryNotExists('Another Entry');
    });

    test('should filter entries by tag', async () => {
      await vaultPage.createEntry(testEntry);
      await vaultPage.createEntry({
        ...testEntry,
        title: 'Personal Entry',
        tags: ['personal'],
      });

      await vaultPage.filterByTag('work');
      await vaultPage.expectEntryExists(testEntry.title);
      await vaultPage.expectEntryNotExists('Personal Entry');
    });
  });

  test.describe('Password Features', () => {
    test.beforeEach(async () => {
      await vaultPage.signIn(testUser.email, testUser.password);
    });

    test('should generate strong password', async ({ page }) => {
      await page.click('[data-testid="add-entry-button"]');
      await vaultPage.generatePassword();

      const passwordValue = await page.inputValue('[data-testid="password-input"]');
      expect(passwordValue.length).toBeGreaterThanOrEqual(16);

      const strength = await vaultPage.getPasswordStrength();
      expect(['Good', 'Strong']).toContain(strength);
    });

    test('should copy password to clipboard', async ({ page, context }) => {
      await vaultPage.createEntry(testEntry);
      
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      
      await vaultPage.copyPassword(testEntry.title);
      
      // Verify clipboard content (this might need adjustment based on browser support)
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe(testEntry.password);
    });

    test('should toggle password visibility', async ({ page }) => {
      await vaultPage.createEntry(testEntry);
      await vaultPage.selectEntry(testEntry.title);

      // Initially password should be hidden
      await expect(page.locator('[data-testid="password-display"]')).toHaveText('••••••••');

      await vaultPage.togglePasswordVisibility(testEntry.title);
      await expect(page.locator('[data-testid="password-display"]')).toHaveText(testEntry.password);
    });
  });

  test.describe('Favorites', () => {
    test.beforeEach(async () => {
      await vaultPage.signIn(testUser.email, testUser.password);
    });

    test('should add and remove favorites', async ({ page }) => {
      await vaultPage.createEntry(testEntry);
      
      // Add to favorites
      await vaultPage.toggleFavorite(testEntry.title);
      await expect(page.locator(`[data-testid="entry-card"][data-title="${testEntry.title}"] [data-testid="favorite-icon"]`))
        .toHaveClass(/favorite-active/);

      // Remove from favorites
      await vaultPage.toggleFavorite(testEntry.title);
      await expect(page.locator(`[data-testid="entry-card"][data-title="${testEntry.title}"] [data-testid="favorite-icon"]`))
        .not.toHaveClass(/favorite-active/);
    });
  });

  test.describe('Security', () => {
    test('should auto-lock after inactivity', async ({ page }) => {
      await vaultPage.signIn(testUser.email, testUser.password);
      await vaultPage.expectSignedIn();

      // Simulate inactivity (this would need to be configured in the app)
      await page.waitForTimeout(60000); // Wait for auto-lock timeout

      await vaultPage.expectSignedOut();
    });

    test('should clear data on sign out', async ({ page }) => {
      await vaultPage.signIn(testUser.email, testUser.password);
      await vaultPage.createEntry(testEntry);

      await vaultPage.signOut();
      await vaultPage.signIn(testUser.email, testUser.password);

      // Data should be loaded fresh from server
      await vaultPage.expectEntryExists(testEntry.title);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await vaultPage.signIn(testUser.email, testUser.password);
      await vaultPage.expectSignedIn();

      await vaultPage.createEntry(testEntry);
      await vaultPage.expectEntryExists(testEntry.title);
    });

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await vaultPage.signIn(testUser.email, testUser.password);
      await vaultPage.expectSignedIn();

      await vaultPage.createEntry(testEntry);
      await vaultPage.expectEntryExists(testEntry.title);
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await vaultPage.goto();
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle large number of entries', async () => {
      await vaultPage.signIn(testUser.email, testUser.password);

      // Create multiple entries
      for (let i = 0; i < 50; i++) {
        await vaultPage.createEntry({
          ...testEntry,
          title: `Entry ${i}`,
        });
      }

      await vaultPage.expectEntryCount(50);
      
      // Search should still be responsive
      await vaultPage.searchEntries('Entry 25');
      await vaultPage.expectEntryExists('Entry 25');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await vaultPage.goto();

      // Tab through the sign-in form
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="sign-in-button"]')).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await vaultPage.goto();

      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label');
    });
  });
});
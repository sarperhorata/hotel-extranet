import { test, expect } from '@playwright/test';

test.describe('Hotel Extranet E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test.describe('Authentication Flow', () => {
    test('should login successfully', async ({ page }) => {
      // Navigate to login page
      await page.click('text=Login');
      
      // Fill login form
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.click('text=Login');
      
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      
      await page.click('button[type="submit"]');
      
      // Verify error message
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Logout
      await page.click('text=Logout');
      
      // Verify redirect to login page
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Property Management', () => {
    test('should create new property', async ({ page }) => {
      // Login
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Navigate to properties
      await page.click('text=Properties');
      
      // Click add property button
      await page.click('text=Add Property');
      
      // Fill property form
      await page.fill('input[name="name"]', 'Test Hotel');
      await page.fill('input[name="address"]', '123 Test Street');
      await page.fill('input[name="city"]', 'Test City');
      await page.fill('input[name="country"]', 'Test Country');
      await page.fill('textarea[name="description"]', 'A beautiful test hotel');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify success message
      await expect(page.locator('text=Property created successfully')).toBeVisible();
    });

    test('should edit existing property', async ({ page }) => {
      // Login and navigate to properties
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.click('text=Properties');
      
      // Click edit button on first property
      await page.click('button[aria-label="Edit property"]');
      
      // Update property name
      await page.fill('input[name="name"]', 'Updated Hotel Name');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify success message
      await expect(page.locator('text=Property updated successfully')).toBeVisible();
    });

    test('should delete property', async ({ page }) => {
      // Login and navigate to properties
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.click('text=Properties');
      
      // Click delete button on first property
      await page.click('button[aria-label="Delete property"]');
      
      // Confirm deletion
      await page.click('text=Confirm');
      
      // Verify success message
      await expect(page.locator('text=Property deleted successfully')).toBeVisible();
    });
  });

  test.describe('Room Management', () => {
    test('should add room to property', async ({ page }) => {
      // Login and navigate to properties
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.click('text=Properties');
      
      // Click on first property
      await page.click('div[data-testid="property-card"]');
      
      // Navigate to rooms tab
      await page.click('text=Rooms');
      
      // Click add room button
      await page.click('text=Add Room');
      
      // Fill room form
      await page.fill('input[name="roomNumber"]', '101');
      await page.fill('input[name="roomType"]', 'Standard');
      await page.fill('input[name="maxOccupancy"]', '2');
      await page.fill('input[name="baseRate"]', '100');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify success message
      await expect(page.locator('text=Room added successfully')).toBeVisible();
    });
  });

  test.describe('Booking Management', () => {
    test('should create new booking', async ({ page }) => {
      // Login
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Navigate to bookings
      await page.click('text=Bookings');
      
      // Click add booking button
      await page.click('text=Add Booking');
      
      // Fill booking form
      await page.fill('input[name="guestName"]', 'John Doe');
      await page.fill('input[name="guestEmail"]', 'john@example.com');
      await page.fill('input[name="checkIn"]', '2024-01-15');
      await page.fill('input[name="checkOut"]', '2024-01-17');
      await page.fill('input[name="guests"]', '2');
      
      // Select property
      await page.click('select[name="propertyId"]');
      await page.click('option[value="property-1"]');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify success message
      await expect(page.locator('text=Booking created successfully')).toBeVisible();
    });

    test('should search bookings', async ({ page }) => {
      // Login and navigate to bookings
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.click('text=Bookings');
      
      // Use search functionality
      await page.fill('input[placeholder="Search bookings..."]', 'John');
      
      // Verify search results
      await expect(page.locator('text=John Doe')).toBeVisible();
    });
  });

  test.describe('Search and Booking Flow', () => {
    test('should complete guest booking flow', async ({ page }) => {
      // Navigate to search page
      await page.goto('http://localhost:3000/search');
      
      // Fill search form
      await page.fill('input[name="destination"]', 'Test City');
      await page.fill('input[name="checkIn"]', '2024-01-15');
      await page.fill('input[name="checkOut"]', '2024-01-17');
      await page.fill('input[name="guests"]', '2');
      
      // Submit search
      await page.click('button[type="submit"]');
      
      // Verify search results
      await expect(page.locator('text=Search Results')).toBeVisible();
      await expect(page.locator('div[data-testid="property-card"]')).toBeVisible();
      
      // Select a property
      await page.click('div[data-testid="property-card"]:first-child');
      
      // Verify property details
      await expect(page.locator('text=Property Details')).toBeVisible();
      
      // Click book now
      await page.click('text=Book Now');
      
      // Fill guest information
      await page.fill('input[name="guestName"]', 'Jane Doe');
      await page.fill('input[name="guestEmail"]', 'jane@example.com');
      await page.fill('input[name="phone"]', '+1234567890');
      
      // Submit booking
      await page.click('button[type="submit"]');
      
      // Verify booking confirmation
      await expect(page.locator('text=Booking Confirmed')).toBeVisible();
      await expect(page.locator('text=Booking Reference')).toBeVisible();
    });
  });

  test.describe('Admin Dashboard', () => {
    test('should display dashboard metrics', async ({ page }) => {
      // Login as admin
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Verify dashboard elements
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Total Properties')).toBeVisible();
      await expect(page.locator('text=Total Bookings')).toBeVisible();
      await expect(page.locator('text=Revenue')).toBeVisible();
    });

    test('should navigate to different sections', async ({ page }) => {
      // Login
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Test navigation
      await page.click('text=Properties');
      await expect(page).toHaveURL(/.*properties/);
      
      await page.click('text=Bookings');
      await expect(page).toHaveURL(/.*bookings/);
      
      await page.click('text=Users');
      await expect(page).toHaveURL(/.*users/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to application
      await page.goto('http://localhost:3000');
      
      // Verify mobile navigation
      await expect(page.locator('button[aria-label="Menu"]')).toBeVisible();
      
      // Test mobile menu
      await page.click('button[aria-label="Menu"]');
      await expect(page.locator('text=Properties')).toBeVisible();
    });

    test('should work on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Navigate to application
      await page.goto('http://localhost:3000');
      
      // Verify tablet layout
      await expect(page.locator('text=Hotel Extranet')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error
      await page.route('**/api/**', route => route.abort());
      
      // Navigate to properties
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.click('text=Properties');
      
      // Verify error message
      await expect(page.locator('text=Network error')).toBeVisible();
    });

    test('should handle validation errors', async ({ page }) => {
      // Login
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Navigate to properties and try to create invalid property
      await page.click('text=Properties');
      await page.click('text=Add Property');
      
      // Submit empty form
      await page.click('button[type="submit"]');
      
      // Verify validation errors
      await expect(page.locator('text=Name is required')).toBeVisible();
      await expect(page.locator('text=Address is required')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load pages quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle large datasets', async ({ page }) => {
      // Login
      await page.click('text=Login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Navigate to bookings (which might have large datasets)
      await page.click('text=Bookings');
      
      // Verify page loads without issues
      await expect(page.locator('text=Bookings')).toBeVisible();
    });
  });
});

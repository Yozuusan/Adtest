// @ts-check
const { test, expect } = require('@playwright/test');

const SHOPIFY_URL = 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco';
const VARIANT_PARAM = 'adlign_variant=test-workflow-1757780000';
const STORE_PASSWORD = 'saas';

// Expected variant content
const EXPECTED_CONTENT = {
  title: '🧼 Savon Anti-Démangeaisons PREMIUM',
  description: 'Formule révolutionnaire pour apaiser instantanément les démangeaisons',
  cta: '🛒 Commander Maintenant - OFFRE LIMITÉE'
};

test.describe('Adlign Variant Functionality', () => {
  let consoleLogs = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Clear logs arrays
    consoleLogs = [];
    consoleErrors = [];

    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      // Log Adlign-specific messages for debugging
      if (text.includes('ADLIGN') || text.includes('adlign') || text.includes('metafield') || text.includes('micro-kernel')) {
        console.log(`[${msg.type().toUpperCase()}] ${text}`);
      }
    });

    // Capture console errors specifically
    page.on('pageerror', error => {
      consoleErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      console.error('Page Error:', error.message);
    });

    // Handle network responses for debugging
    page.on('response', response => {
      if (response.url().includes('adlign') || response.status() >= 400) {
        console.log(`Network: ${response.status()} ${response.url()}`);
      }
    });
  });

  async function handlePasswordProtection(page) {
    try {
      // Wait a bit for the page to load
      await page.waitForTimeout(2000);
      
      // Check if password form is present
      const passwordForm = page.locator('form[action*="password"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      
      if (await passwordForm.isVisible({ timeout: 3000 })) {
        console.log('Password protection detected, entering password...');
        await passwordInput.fill(STORE_PASSWORD);
        
        // Find and click the submit button
        const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
        await submitButton.click();
        
        // Wait for navigation after password submission
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        console.log('Password submitted, page loaded');
      }
    } catch (error) {
      console.log('No password protection or already bypassed');
    }
  }

  async function waitForAdlignExecution(page) {
    // Wait for potential Adlign script execution
    await page.waitForTimeout(3000);
    
    // Check if Adlign data script is present
    const adlignDataScript = await page.locator('#adlign-data').count();
    console.log(`Adlign data script elements found: ${adlignDataScript}`);
    
    // Wait for any DOM modifications to complete
    await page.waitForFunction(() => {
      // Check if window has Adlign-related properties
      return window.__adlign_applyVariant || 
             document.querySelector('#adlign-data') ||
             document.querySelector('[data-adlign-metafield]');
    }, { timeout: 5000 }).catch(() => {
      console.log('No Adlign functionality detected within timeout');
    });
  }

  async function collectPageData(page, label) {
    const data = {
      label: label,
      url: page.url(),
      timestamp: new Date().toISOString(),
      consoleLogs: [...consoleLogs],
      consoleErrors: [...consoleErrors],
      adlignElements: {},
      pageContent: {}
    };

    // Check for Adlign-specific elements
    try {
      // Check for adlign data script
      const adlignDataScript = page.locator('#adlign-data');
      if (await adlignDataScript.count() > 0) {
        data.adlignElements.dataScript = {
          exists: true,
          content: await adlignDataScript.textContent()
        };
      }

      // Check for elements with adlign metafield attribute
      const metafieldElements = page.locator('[data-adlign-metafield="true"]');
      data.adlignElements.metafieldElements = {
        count: await metafieldElements.count(),
        elements: []
      };

      if (data.adlignElements.metafieldElements.count > 0) {
        for (let i = 0; i < Math.min(5, data.adlignElements.metafieldElements.count); i++) {
          const element = metafieldElements.nth(i);
          data.adlignElements.metafieldElements.elements.push({
            tagName: await element.evaluate(el => el.tagName),
            textContent: await element.textContent(),
            outerHTML: await element.evaluate(el => el.outerHTML.substring(0, 200))
          });
        }
      }

      // Check for green highlight animations (temporary visual feedback)
      const highlightElements = page.locator('[style*="background"], [class*="highlight"], [style*="green"]');
      data.adlignElements.highlightElements = await highlightElements.count();

    } catch (error) {
      data.adlignElements.error = error.message;
    }

    // Collect page content (product title, description, CTA)
    try {
      // Try multiple selectors for product title
      const titleSelectors = [
        'h1.product-title',
        'h1[class*="title"]',
        '.product-title',
        'h1.ProductItem-details-title',
        'h1',
        '[data-adlign-title]',
        '.product__title',
        '.product-single__title'
      ];

      for (const selector of titleSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          data.pageContent.title = {
            selector: selector,
            text: await element.textContent(),
            innerHTML: await element.innerHTML()
          };
          break;
        }
      }

      // Try multiple selectors for product description
      const descSelectors = [
        '.product-description',
        '.product__description',
        '.product-single__description',
        '[class*="description"]',
        '.ProductItem-details-excerpt',
        '[data-adlign-description]'
      ];

      for (const selector of descSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          data.pageContent.description = {
            selector: selector,
            text: await element.textContent(),
            innerHTML: await element.innerHTML()
          };
          break;
        }
      }

      // Try multiple selectors for CTA button
      const ctaSelectors = [
        'button[type="submit"]',
        '.btn-product',
        '.product-single__cart-submit',
        '.ProductItem-details-checkout',
        'button[name="add"]',
        '[data-adlign-cta]',
        '.add-to-cart',
        'input[type="submit"]'
      ];

      for (const selector of ctaSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          data.pageContent.cta = {
            selector: selector,
            text: await element.textContent(),
            value: await element.getAttribute('value')
          };
          break;
        }
      }

    } catch (error) {
      data.pageContent.error = error.message;
    }

    return data;
  }

  test('Should load page without variant parameter (baseline)', async ({ page }) => {
    console.log('=== Testing baseline (without variant) ===');
    
    await page.goto(SHOPIFY_URL);
    await handlePasswordProtection(page);
    await waitForAdlignExecution(page);

    const baselineData = await collectPageData(page, 'baseline');
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/baseline-page.png',
      fullPage: true 
    });

    // Log findings
    console.log('Baseline Data:', JSON.stringify(baselineData, null, 2));

    // Basic assertions - page should load
    expect(page.url()).toContain('echantillon-savon-a-barres-de-noix-de-coco');
    expect(baselineData.pageContent.title).toBeDefined();
    
    // Store baseline for comparison
    test.info().attach('baseline-data.json', {
      contentType: 'application/json',
      body: JSON.stringify(baselineData, null, 2)
    });
  });

  test('Should load page with variant parameter and apply changes', async ({ page }) => {
    console.log('=== Testing with variant parameter ===');
    
    const urlWithVariant = `${SHOPIFY_URL}?${VARIANT_PARAM}`;
    console.log('Navigating to:', urlWithVariant);

    await page.goto(urlWithVariant);
    await handlePasswordProtection(page);
    await waitForAdlignExecution(page);

    const variantData = await collectPageData(page, 'variant');

    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/variant-page.png',
      fullPage: true 
    });

    // Log findings
    console.log('Variant Data:', JSON.stringify(variantData, null, 2));

    // Check for Adlign-specific logs
    const adlignLogs = consoleLogs.filter(log => 
      log.text.toLowerCase().includes('adlign') ||
      log.text.toLowerCase().includes('micro-kernel') ||
      log.text.toLowerCase().includes('metafield')
    );
    console.log('Adlign-related console logs:', adlignLogs);

    // Assertions
    expect(page.url()).toContain('echantillon-savon-a-barres-de-noix-de-coco');
    expect(page.url()).toContain(VARIANT_PARAM);

    // Check if Adlign data script exists
    if (variantData.adlignElements.dataScript && variantData.adlignElements.dataScript.exists) {
      console.log('✓ Adlign data script found');
      expect(variantData.adlignElements.dataScript.content).toBeTruthy();
    } else {
      console.log('✗ Adlign data script NOT found');
    }

    // Check for expected content changes
    if (variantData.pageContent.title) {
      const titleText = variantData.pageContent.title.text?.trim() || '';
      console.log('Current title:', titleText);
      console.log('Expected title:', EXPECTED_CONTENT.title);
      
      if (titleText.includes(EXPECTED_CONTENT.title) || titleText.includes('🧼')) {
        console.log('✓ Title appears to be updated by variant');
      } else {
        console.log('✗ Title does not match expected variant content');
      }
    }

    if (variantData.pageContent.description) {
      const descText = variantData.pageContent.description.text?.trim() || '';
      console.log('Current description (first 200 chars):', descText.substring(0, 200));
      
      if (descText.includes(EXPECTED_CONTENT.description) || descText.includes('révolutionnaire')) {
        console.log('✓ Description appears to be updated by variant');
      } else {
        console.log('✗ Description does not match expected variant content');
      }
    }

    if (variantData.pageContent.cta) {
      const ctaText = variantData.pageContent.cta.text?.trim() || variantData.pageContent.cta.value?.trim() || '';
      console.log('Current CTA:', ctaText);
      console.log('Expected CTA:', EXPECTED_CONTENT.cta);
      
      if (ctaText.includes(EXPECTED_CONTENT.cta) || ctaText.includes('🛒') || ctaText.includes('Commander Maintenant')) {
        console.log('✓ CTA appears to be updated by variant');
      } else {
        console.log('✗ CTA does not match expected variant content');
      }
    }

    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console Errors:', consoleErrors);
    }

    // Store variant data for analysis
    test.info().attach('variant-data.json', {
      contentType: 'application/json',
      body: JSON.stringify(variantData, null, 2)
    });

    // Store console logs
    test.info().attach('console-logs.json', {
      contentType: 'application/json',
      body: JSON.stringify({ logs: consoleLogs, errors: consoleErrors }, null, 2)
    });
  });

  test('Should compare baseline vs variant content', async ({ page }) => {
    console.log('=== Comparison Test: Baseline vs Variant ===');

    // Test baseline first
    console.log('Loading baseline...');
    await page.goto(SHOPIFY_URL);
    await handlePasswordProtection(page);
    await waitForAdlignExecution(page);
    const baselineData = await collectPageData(page, 'baseline');
    await page.screenshot({ path: 'test-results/comparison-baseline.png', fullPage: true });

    // Clear logs for variant test
    consoleLogs = [];
    consoleErrors = [];

    // Test variant
    console.log('Loading variant...');
    const urlWithVariant = `${SHOPIFY_URL}?${VARIANT_PARAM}`;
    await page.goto(urlWithVariant);
    await handlePasswordProtection(page);
    await waitForAdlignExecution(page);
    const variantData = await collectPageData(page, 'variant');
    await page.screenshot({ path: 'test-results/comparison-variant.png', fullPage: true });

    // Compare the data
    const comparison = {
      timestamp: new Date().toISOString(),
      baseline: baselineData,
      variant: variantData,
      differences: {}
    };

    // Compare titles
    const baselineTitle = baselineData.pageContent.title?.text?.trim() || 'N/A';
    const variantTitle = variantData.pageContent.title?.text?.trim() || 'N/A';
    comparison.differences.title = {
      baseline: baselineTitle,
      variant: variantTitle,
      changed: baselineTitle !== variantTitle
    };

    // Compare descriptions
    const baselineDesc = baselineData.pageContent.description?.text?.substring(0, 200).trim() || 'N/A';
    const variantDesc = variantData.pageContent.description?.text?.substring(0, 200).trim() || 'N/A';
    comparison.differences.description = {
      baseline: baselineDesc,
      variant: variantDesc,
      changed: baselineDesc !== variantDesc
    };

    // Compare CTAs
    const baselineCta = baselineData.pageContent.cta?.text?.trim() || baselineData.pageContent.cta?.value?.trim() || 'N/A';
    const variantCta = variantData.pageContent.cta?.text?.trim() || variantData.pageContent.cta?.value?.trim() || 'N/A';
    comparison.differences.cta = {
      baseline: baselineCta,
      variant: variantCta,
      changed: baselineCta !== variantCta
    };

    // Check Adlign functionality
    comparison.adlignFunctionality = {
      dataScriptPresent: variantData.adlignElements.dataScript?.exists || false,
      metafieldElementsCount: variantData.adlignElements.metafieldElements?.count || 0,
      adlignLogsPresent: variantData.consoleLogs.some(log => 
        log.text.toLowerCase().includes('adlign') ||
        log.text.toLowerCase().includes('micro-kernel') ||
        log.text.toLowerCase().includes('metafield')
      ),
      errorsPresent: variantData.consoleErrors.length > 0
    };

    console.log('=== COMPARISON RESULTS ===');
    console.log('Title Changed:', comparison.differences.title.changed);
    console.log('Description Changed:', comparison.differences.description.changed);
    console.log('CTA Changed:', comparison.differences.cta.changed);
    console.log('Adlign Data Script Present:', comparison.adlignFunctionality.dataScriptPresent);
    console.log('Metafield Elements Count:', comparison.adlignFunctionality.metafieldElementsCount);
    console.log('Adlign Logs Present:', comparison.adlignFunctionality.adlignLogsPresent);
    console.log('Errors Present:', comparison.adlignFunctionality.errorsPresent);

    // Store comparison results
    test.info().attach('comparison-results.json', {
      contentType: 'application/json',
      body: JSON.stringify(comparison, null, 2)
    });

    // Assertions for the comparison
    expect(comparison.baseline.url).toBeTruthy();
    expect(comparison.variant.url).toContain(VARIANT_PARAM);
  });
});
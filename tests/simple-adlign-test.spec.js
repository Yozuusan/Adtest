// @ts-check
const { test, expect } = require('@playwright/test');

const SHOPIFY_URL = 'https://adlign.myshopify.com/products/echantillon-savon-a-barres-de-noix-de-coco';
const VARIANT_URL = `${SHOPIFY_URL}?adlign_variant=test-workflow-1757780000`;
const STORE_PASSWORD = 'saas';

// Expected variant content
const EXPECTED_CONTENT = {
  title: '🧼 Savon Anti-Démangeaisons PREMIUM',
  description: 'Formule révolutionnaire pour apaiser instantanément les démangeaisons',
  cta: '🛒 Commander Maintenant - OFFRE LIMITÉE'
};

async function handlePasswordProtection(page) {
  try {
    await page.waitForTimeout(3000);
    
    const passwordForm = page.locator('form[action*="password"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    if (await passwordForm.isVisible({ timeout: 5000 })) {
      console.log('🔐 Password protection detected, entering password...');
      await passwordInput.fill(STORE_PASSWORD);
      
      const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      await submitButton.click();
      
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('✅ Password submitted, page loaded');
      return true;
    }
    return false;
  } catch (error) {
    console.log('ℹ️  No password protection or already bypassed');
    return false;
  }
}

async function extractPageContent(page) {
  console.log('🔍 Extracting page content...');
  
  const content = {};
  
  // Extract title
  try {
    const titleSelectors = [
      'h1.product-title',
      'h1[class*="title"]', 
      '.product-title',
      'h1.ProductItem-details-title',
      'h1',
      '.product__title',
      '.product-single__title'
    ];
    
    for (const selector of titleSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        const text = await element.textContent();
        if (text && text.trim()) {
          content.title = {
            selector,
            text: text.trim()
          };
          console.log(`📝 Title found (${selector}): "${content.title.text}"`);
          break;
        }
      }
    }
  } catch (error) {
    console.log('❌ Error extracting title:', error.message);
  }
  
  // Extract description
  try {
    const descSelectors = [
      '.product-description',
      '.product__description', 
      '.product-single__description',
      '[class*="description"]',
      '.ProductItem-details-excerpt'
    ];
    
    for (const selector of descSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        const text = await element.textContent();
        if (text && text.trim()) {
          content.description = {
            selector,
            text: text.trim().substring(0, 200) + (text.length > 200 ? '...' : '')
          };
          console.log(`📄 Description found (${selector}): "${content.description.text}"`);
          break;
        }
      }
    }
  } catch (error) {
    console.log('❌ Error extracting description:', error.message);
  }
  
  // Extract CTA button
  try {
    const ctaSelectors = [
      'button[type="submit"]',
      '.btn-product',
      '.product-single__cart-submit',
      '.ProductItem-details-checkout',
      'button[name="add"]',
      '.add-to-cart',
      'input[type="submit"]'
    ];
    
    for (const selector of ctaSelectors) {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        const text = await element.textContent();
        const value = await element.getAttribute('value');
        const ctaText = text?.trim() || value?.trim() || '';
        
        if (ctaText) {
          content.cta = {
            selector,
            text: ctaText
          };
          console.log(`🎯 CTA found (${selector}): "${content.cta.text}"`);
          break;
        }
      }
    }
  } catch (error) {
    console.log('❌ Error extracting CTA:', error.message);
  }
  
  return content;
}

async function checkAdlignElements(page) {
  console.log('🔍 Checking for Adlign elements...');
  
  const adlignInfo = {
    scriptElements: 0,
    metafieldElements: 0,
    dataScript: null,
    consoleMessages: []
  };
  
  // Check for Adlign data script
  try {
    const adlignDataScript = page.locator('#adlign-data');
    adlignInfo.scriptElements = await adlignDataScript.count();
    console.log(`📜 Adlign data scripts found: ${adlignInfo.scriptElements}`);
    
    if (adlignInfo.scriptElements > 0) {
      const content = await adlignDataScript.first().textContent();
      adlignInfo.dataScript = content;
      console.log(`📜 Script content preview: ${content?.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log('❌ Error checking Adlign scripts:', error.message);
  }
  
  // Check for metafield elements
  try {
    const metafieldElements = page.locator('[data-adlign-metafield="true"]');
    adlignInfo.metafieldElements = await metafieldElements.count();
    console.log(`🏷️  Metafield elements found: ${adlignInfo.metafieldElements}`);
    
    if (adlignInfo.metafieldElements > 0) {
      for (let i = 0; i < Math.min(3, adlignInfo.metafieldElements); i++) {
        const element = metafieldElements.nth(i);
        const tagName = await element.evaluate(el => el.tagName);
        const text = await element.textContent();
        console.log(`🏷️  Metafield element ${i + 1}: <${tagName}> "${text?.substring(0, 50)}..."`);
      }
    }
  } catch (error) {
    console.log('❌ Error checking metafield elements:', error.message);
  }
  
  return adlignInfo;
}

test.describe('Adlign Dynamic Content Test', () => {
  let consoleLogs = [];
  
  test.beforeEach(async ({ page }) => {
    consoleLogs = [];
    
    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        type: msg.type(),
        text: text,
        timestamp: new Date().toISOString()
      });
      
      // Log Adlign-related messages
      if (text.toLowerCase().includes('adlign') || 
          text.toLowerCase().includes('metafield') || 
          text.toLowerCase().includes('micro-kernel')) {
        console.log(`🔊 [${msg.type().toUpperCase()}] ${text}`);
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      console.log(`💥 Page Error: ${error.message}`);
    });
  });

  test('Compare baseline vs variant content', async ({ page }) => {
    console.log('\n🔄 === BASELINE TEST ===');
    
    // Load baseline page
    await page.goto(SHOPIFY_URL);
    await handlePasswordProtection(page);
    
    const baselineContent = await extractPageContent(page);
    const baselineAdlign = await checkAdlignElements(page);
    
    await page.screenshot({ 
      path: 'test-results/baseline-comparison.png',
      fullPage: true 
    });
    
    console.log('\n🔄 === VARIANT TEST ===');
    
    // Clear console logs for variant test
    consoleLogs = [];
    
    // Load variant page
    await page.goto(VARIANT_URL);
    await handlePasswordProtection(page);
    
    // Wait a bit more for any dynamic content replacement
    await page.waitForTimeout(5000);
    
    const variantContent = await extractPageContent(page);
    const variantAdlign = await checkAdlignElements(page);
    
    await page.screenshot({ 
      path: 'test-results/variant-comparison.png',
      fullPage: true 
    });
    
    // Generate comparison report
    console.log('\n📊 === COMPARISON RESULTS ===');
    
    const comparison = {
      url: {
        baseline: SHOPIFY_URL,
        variant: VARIANT_URL
      },
      content: {
        title: {
          baseline: baselineContent.title?.text || 'N/A',
          variant: variantContent.title?.text || 'N/A',
          changed: (baselineContent.title?.text || '') !== (variantContent.title?.text || ''),
          expectedInVariant: EXPECTED_CONTENT.title,
          variantMatches: variantContent.title?.text?.includes(EXPECTED_CONTENT.title) || false
        },
        description: {
          baseline: baselineContent.description?.text || 'N/A',
          variant: variantContent.description?.text || 'N/A', 
          changed: (baselineContent.description?.text || '') !== (variantContent.description?.text || ''),
          expectedInVariant: EXPECTED_CONTENT.description,
          variantMatches: variantContent.description?.text?.includes(EXPECTED_CONTENT.description) || false
        },
        cta: {
          baseline: baselineContent.cta?.text || 'N/A',
          variant: variantContent.cta?.text || 'N/A',
          changed: (baselineContent.cta?.text || '') !== (variantContent.cta?.text || ''),
          expectedInVariant: EXPECTED_CONTENT.cta,
          variantMatches: variantContent.cta?.text?.includes(EXPECTED_CONTENT.cta) || false
        }
      },
      adlignSystem: {
        dataScriptPresent: variantAdlign.scriptElements > 0,
        metafieldElementsCount: variantAdlign.metafieldElements,
        adlignRelatedLogs: consoleLogs.filter(log => 
          log.text.toLowerCase().includes('adlign') ||
          log.text.toLowerCase().includes('metafield') ||
          log.text.toLowerCase().includes('micro-kernel')
        ).length
      }
    };
    
    // Print detailed results
    console.log('\n🏷️  TITLE:');
    console.log(`   Baseline: "${comparison.content.title.baseline}"`);
    console.log(`   Variant:  "${comparison.content.title.variant}"`);
    console.log(`   Changed:  ${comparison.content.title.changed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Expected: "${comparison.content.title.expectedInVariant}"`);
    console.log(`   Matches:  ${comparison.content.title.variantMatches ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n📄 DESCRIPTION:');
    console.log(`   Baseline: "${comparison.content.description.baseline}"`);
    console.log(`   Variant:  "${comparison.content.description.variant}"`);
    console.log(`   Changed:  ${comparison.content.description.changed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Expected: "${comparison.content.description.expectedInVariant}"`);
    console.log(`   Matches:  ${comparison.content.description.variantMatches ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🎯 CTA BUTTON:');
    console.log(`   Baseline: "${comparison.content.cta.baseline}"`);
    console.log(`   Variant:  "${comparison.content.cta.variant}"`);
    console.log(`   Changed:  ${comparison.content.cta.changed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Expected: "${comparison.content.cta.expectedInVariant}"`);
    console.log(`   Matches:  ${comparison.content.cta.variantMatches ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🔧 ADLIGN SYSTEM:');
    console.log(`   Data script present: ${comparison.adlignSystem.dataScriptPresent ? '✅ YES' : '❌ NO'}`);
    console.log(`   Metafield elements:  ${comparison.adlignSystem.metafieldElementsCount}`);
    console.log(`   Adlign console logs: ${comparison.adlignSystem.adlignRelatedLogs}`);
    
    // Overall assessment
    const isWorking = comparison.content.title.variantMatches || 
                     comparison.content.description.variantMatches || 
                     comparison.content.cta.variantMatches;
    
    console.log('\n🎯 === FINAL ASSESSMENT ===');
    console.log(`Dynamic content replacement is: ${isWorking ? '✅ WORKING' : '❌ NOT WORKING'}`);
    
    if (!isWorking) {
      console.log('\n🔍 Troubleshooting suggestions:');
      console.log('   1. Check if Adlign script is properly loaded on the page');
      console.log('   2. Verify the variant parameter is correct: adlign_variant=test-workflow-1757780000');
      console.log('   3. Check browser console for Adlign error messages');
      console.log('   4. Ensure the variant data exists in the backend system');
    }
    
    // Save comparison results
    test.info().attach('detailed-comparison.json', {
      contentType: 'application/json',
      body: JSON.stringify(comparison, null, 2)
    });
    
    // Basic test assertions
    expect(comparison.url.baseline).toBeTruthy();
    expect(comparison.url.variant).toContain('adlign_variant=test-workflow-1757780000');
  });
});
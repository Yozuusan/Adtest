const { chromium } = require('playwright');

async function debugShopifyStore() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen for console messages
    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type()}]`, msg.text());
    });

    // Listen for network failures
    page.on('response', response => {
        if (!response.ok()) {
            console.log(`[NETWORK ERROR] ${response.status()} - ${response.url()}`);
        }
    });

    try {
        console.log('🔍 Navigating to Shopify store...');
        await page.goto('https://adlign.myshopify.com', { waitUntil: 'networkidle' });
        
        console.log('\n📄 Page title:', await page.title());
        console.log('📍 Current URL:', page.url());

        // Check for Adlign scripts or elements
        console.log('\n🔍 Checking for Adlign-related elements...');
        const adlignScripts = await page.$$eval('script', scripts => 
            scripts.filter(script => 
                script.src?.includes('adlign') || 
                script.textContent?.includes('adlign') ||
                script.textContent?.includes('Adlign')
            ).map(script => ({
                src: script.src,
                hasContent: script.textContent?.length > 0
            }))
        );
        
        if (adlignScripts.length > 0) {
            console.log('✅ Found Adlign scripts:', adlignScripts);
        } else {
            console.log('❌ No Adlign scripts found');
        }

        // Look for products on the main page
        console.log('\n🛍️ Looking for products...');
        const productLinks = await page.$$eval('a[href*="/products/"]', links =>
            links.map(link => ({
                href: link.href,
                text: link.textContent?.trim()
            })).filter(link => link.text)
        );

        if (productLinks.length > 0) {
            console.log('📦 Found product links:');
            productLinks.forEach((link, index) => {
                console.log(`  ${index + 1}. ${link.text} - ${link.href}`);
            });
        }

        // Try to navigate to collections or all products
        console.log('\n🔍 Trying to find all products...');
        try {
            await page.goto('https://adlign.myshopify.com/collections/all', { waitUntil: 'networkidle' });
            console.log('✅ Successfully navigated to /collections/all');
            
            const allProducts = await page.$$eval('a[href*="/products/"]', links =>
                links.map(link => ({
                    href: link.href,
                    text: link.textContent?.trim()
                })).filter(link => link.text)
            );
            
            console.log(`📦 Found ${allProducts.length} products in collection:`);
            allProducts.forEach((product, index) => {
                console.log(`  ${index + 1}. ${product.text} - ${product.href}`);
            });

            // Look for coconut soap specifically
            const coconutProducts = allProducts.filter(product => 
                product.text.toLowerCase().includes('coconut') || 
                product.text.toLowerCase().includes('coco') ||
                product.text.toLowerCase().includes('savon') ||
                product.href.includes('coco') ||
                product.href.includes('savon')
            );

            if (coconutProducts.length > 0) {
                console.log('\n🥥 Found potential coconut soap products:');
                coconutProducts.forEach((product, index) => {
                    console.log(`  ${index + 1}. ${product.text} - ${product.href}`);
                });
            }

        } catch (error) {
            console.log('❌ Could not access /collections/all:', error.message);
        }

        // Test the original problematic URL
        console.log('\n🧪 Testing original problematic URL...');
        try {
            await page.goto('https://adlign.myshopify.com/products/savon-a-base-de-noix-de-coco', { waitUntil: 'networkidle' });
            console.log('✅ Original URL without variant parameter works!');
            console.log('📍 Current URL:', page.url());
            console.log('📄 Page title:', await page.title());
            
            // Check for 404 indicators
            const bodyText = await page.textContent('body');
            if (bodyText.toLowerCase().includes('404') || bodyText.toLowerCase().includes('not found')) {
                console.log('❌ Page shows 404 error');
            }

        } catch (error) {
            console.log('❌ Original URL failed:', error.message);
        }

        // Test with the variant parameter
        console.log('\n🧪 Testing URL with adlign_variant parameter...');
        try {
            await page.goto('https://adlign.myshopify.com/products/savon-a-base-de-noix-de-coco?adlign_variant=test-workflow-1757780000', { waitUntil: 'networkidle' });
            console.log('✅ URL with variant parameter works!');
            console.log('📍 Current URL:', page.url());
            console.log('📄 Page title:', await page.title());
            
            // Check for 404 indicators
            const bodyText = await page.textContent('body');
            if (bodyText.toLowerCase().includes('404') || bodyText.toLowerCase().includes('not found')) {
                console.log('❌ Page shows 404 error');
            }

            // Check if Adlign variant parameter is being processed
            const adlignVariantElements = await page.$$eval('*', elements =>
                elements.filter(el => 
                    el.textContent?.includes('test-workflow-1757780000') ||
                    el.getAttribute('data-adlign-variant') ||
                    el.getAttribute('data-variant')
                ).map(el => ({
                    tagName: el.tagName,
                    id: el.id,
                    className: el.className,
                    textContent: el.textContent?.substring(0, 100)
                }))
            );

            if (adlignVariantElements.length > 0) {
                console.log('✅ Found elements with variant information:', adlignVariantElements);
            } else {
                console.log('❌ No elements found processing the variant parameter');
            }

        } catch (error) {
            console.log('❌ URL with variant parameter failed:', error.message);
        }

        // Try to search for product by ID using Shopify API patterns
        console.log('\n🔍 Trying to access product by ID...');
        const productId = '15096939610438';
        try {
            // Try different URL patterns for accessing by ID
            const urlsToTry = [
                `https://adlign.myshopify.com/products/${productId}`,
                `https://adlign.myshopify.com/admin/products/${productId}`,
                `https://adlign.myshopify.com/products.json?ids=${productId}`
            ];

            for (const url of urlsToTry) {
                try {
                    console.log(`  Trying: ${url}`);
                    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
                    console.log(`  ✅ Success with: ${url}`);
                    console.log(`  📍 Final URL: ${page.url()}`);
                    console.log(`  📄 Title: ${await page.title()}`);
                    break;
                } catch (e) {
                    console.log(`  ❌ Failed: ${e.message}`);
                }
            }
        } catch (error) {
            console.log('❌ Could not access product by ID:', error.message);
        }

        // Check current page source for any clues
        console.log('\n🔍 Analyzing page source...');
        const pageSource = await page.content();
        
        // Look for product data in JSON scripts
        const jsonScripts = await page.$$eval('script[type="application/json"], script[type="application/ld+json"]', scripts =>
            scripts.map(script => ({
                type: script.type,
                content: script.textContent?.substring(0, 200) + '...'
            }))
        );

        if (jsonScripts.length > 0) {
            console.log('📄 Found JSON scripts:', jsonScripts);
        }

        // Wait a moment to see any delayed console messages
        await page.waitForTimeout(2000);

    } catch (error) {
        console.error('❌ Error during debugging:', error);
    } finally {
        await browser.close();
    }
}

// Run the debug script
debugShopifyStore().then(() => {
    console.log('\n✅ Debugging complete!');
}).catch(error => {
    console.error('❌ Script failed:', error);
});
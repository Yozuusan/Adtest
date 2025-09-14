const fs = require('fs');

async function deployTemplate() {
  try {
    // Read the template content
    const templateContent = fs.readFileSync('/Users/yonezu/Desktop/Adlign/shopify-theme/templates/product.adlign.liquid', 'utf8');
    
    // Get the shop token - we'll use the existing backend logic
    const response = await fetch('https://adtest-production.up.railway.app/debug/shop?shop=adlign.myshopify.com');
    const diagnostic = await response.json();
    
    if (!diagnostic.service_token.has_access_token) {
      console.error('❌ No access token available');
      return;
    }
    
    console.log('✅ Shop authenticated');
    
    // Get the main theme ID
    const themesResponse = await fetch('https://adlign.myshopify.com/admin/api/2024-07/themes.json', {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': 'need_token_here' // We need to extract this from the backend
      }
    });
    
    if (!themesResponse.ok) {
      console.error('❌ Failed to get themes:', await themesResponse.text());
      return;
    }
    
    const themesData = await themesResponse.json();
    const mainTheme = themesData.themes.find(theme => theme.role === 'main');
    
    if (!mainTheme) {
      console.error('❌ No main theme found');
      return;
    }
    
    console.log(`🎨 Found main theme: ${mainTheme.name} (ID: ${mainTheme.id})`);
    
    // Deploy the template
    const deployResponse = await fetch(`https://adlign.myshopify.com/admin/api/2024-07/themes/${mainTheme.id}/assets.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': 'need_token_here' // We need to extract this from the backend
      },
      body: JSON.stringify({
        asset: {
          key: 'templates/product.adlign.liquid',
          value: templateContent
        }
      })
    });
    
    if (!deployResponse.ok) {
      const error = await deployResponse.text();
      console.error('❌ Template deployment failed:', {
        status: deployResponse.status,
        statusText: deployResponse.statusText,
        error
      });
      return;
    }
    
    console.log('✅ Template deployed successfully!');
    
  } catch (error) {
    console.error('❌ Deployment script error:', error);
  }
}

deployTemplate();
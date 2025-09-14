const fetch = require('node-fetch');

// Test script for Shopify Theme Assets API deployment
async function testThemeAssetDeployment() {
  const shop = 'adlign.myshopify.com';
  const themeId = '182285697350';
  
  // Test snippet content (minimal working example)
  const testSnippetContent = `{% comment %}
  Adlign Metaobject Injector
  This snippet injects dynamic content based on Adlign metaobjects
{% endcomment %}

<div id="adlign-content" style="display: none;">
  {% comment %} Adlign dynamic content will be injected here {% endcomment %}
  <script type="application/json" id="adlign-config">
  {
    "shop": "{{ shop.domain }}",
    "product": "{{ product.handle | default: 'none' }}",
    "timestamp": "{{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}"
  }
  </script>
</div>

<script>
  console.log('Adlign snippet loaded');
</script>`;

  // Test JavaScript content (minimal working example)
  const testJsContent = `// Adlign Micro-kernel v1.0
console.log('🚀 Adlign micro-kernel loaded');

window.AdlignMicroKernel = {
  version: '1.0.0',
  init: function() {
    console.log('Adlign micro-kernel initialized');
  },
  injectContent: function(content) {
    console.log('Injecting content:', content);
  }
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.AdlignMicroKernel.init);
} else {
  window.AdlignMicroKernel.init();
}`;

  console.log('🧪 Testing Shopify Theme Assets API deployment...');
  console.log('Shop:', shop);
  console.log('Theme ID:', themeId);
  
  // You'll need to replace this with an actual access token
  const accessToken = 'YOUR_ACCESS_TOKEN_HERE';
  
  if (accessToken === 'YOUR_ACCESS_TOKEN_HERE') {
    console.log('❌ Error: Please replace YOUR_ACCESS_TOKEN_HERE with actual access token');
    return;
  }

  try {
    // Test 1: Deploy snippet file
    console.log('\n🔧 Test 1: Deploying Liquid snippet...');
    const snippetResponse = await fetch(`https://${shop}/admin/api/2024-07/themes/${themeId}/assets.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        asset: {
          key: 'snippets/adlign_metaobject_injector.liquid',
          value: testSnippetContent
        }
      }),
    });

    console.log('Snippet Response Status:', snippetResponse.status);
    console.log('Snippet Response Headers:', Object.fromEntries(snippetResponse.headers.entries()));
    
    if (snippetResponse.ok) {
      const snippetResult = await snippetResponse.json();
      console.log('✅ Snippet deployed successfully!');
      console.log('Snippet Result:', snippetResult);
    } else {
      const snippetError = await snippetResponse.text();
      console.log('❌ Snippet deployment failed');
      console.log('Error:', snippetError);
    }

    // Test 2: Deploy JavaScript file
    console.log('\n🔧 Test 2: Deploying JavaScript micro-kernel...');
    const jsResponse = await fetch(`https://${shop}/admin/api/2024-07/themes/${themeId}/assets.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        asset: {
          key: 'assets/adlign-micro-kernel.js',
          value: testJsContent
        }
      }),
    });

    console.log('JS Response Status:', jsResponse.status);
    console.log('JS Response Headers:', Object.fromEntries(jsResponse.headers.entries()));
    
    if (jsResponse.ok) {
      const jsResult = await jsResponse.json();
      console.log('✅ JavaScript deployed successfully!');
      console.log('JS Result:', jsResult);
    } else {
      const jsError = await jsResponse.text();
      console.log('❌ JavaScript deployment failed');
      console.log('Error:', jsError);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testThemeAssetDeployment();
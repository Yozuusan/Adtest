/**
 * Adlign Micro-Kernel
 * 
 * Micro-kernel JavaScript (<10KB gz) qui :
 * - Lit #adlign-data (JSON signé inline)
 * - Applique les patchs DOM selon ThemeAdapter
 * - Aucun fetch réseau côté client
 * - Fallback si sélecteur manquant
 */

(function() {
  'use strict';
  
  // Configuration
  const CONFIG = {
    DATA_SELECTOR: '#adlign-data',
    FALLBACK_ENABLED: true,
    DEBUG: false
  };
  
  // Logging
  function log(message, ...args) {
    if (CONFIG.DEBUG) {
      console.log('[Adlign]', message, ...args);
    }
  }
  
  // Main function
  function init() {
    try {
      log('Initializing Adlign micro-kernel...');
      
      // Check if variant data is present
      const variantData = getVariantData();
      if (!variantData) {
        log('No variant data found, exiting');
        return;
      }
      
      // Apply variant changes
      applyVariant(variantData);
      
      log('Variant applied successfully');
      
    } catch (error) {
      console.error('[Adlign] Error:', error);
    }
  }
  
  // Get variant data from inline JSON
  function getVariantData() {
    const dataElement = document.querySelector(CONFIG.DATA_SELECTOR);
    if (!dataElement) return null;
    
    try {
      return JSON.parse(dataElement.textContent || '{}');
    } catch (error) {
      log('Failed to parse variant data:', error);
      return null;
    }
  }
  
  // Apply variant changes to DOM
  function applyVariant(variantData) {
    if (!variantData) return;

    const adapter = variantData.theme_adapter || {};
    const selectors = adapter.selectors || {};
    const content = variantData.variant_data || {};

    const mapping = {
      title: 'title',
      description_html: 'description',
      cta_primary: 'add_to_cart',
      promotional_badge: 'promotional_badge'
    };

    Object.entries(mapping).forEach(([contentKey, selectorKey]) => {
      const selector = selectors[selectorKey];
      const value = content[contentKey];
      if (!selector || !value) return;

      const el = document.querySelector(selector);
      if (el) {
        if (contentKey === 'description_html') {
          el.innerHTML = value;
        } else {
          el.textContent = value;
        }
      } else if (CONFIG.FALLBACK_ENABLED) {
        log('Selector not found:', selector);
      }
    });
  }

  // Expose for tests
  if (typeof window !== 'undefined') {
    window.__adlign_applyVariant = applyVariant;
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();

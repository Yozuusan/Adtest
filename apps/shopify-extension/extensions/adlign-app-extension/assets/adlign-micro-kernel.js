/**
 * Adlign Micro Kernel - Version Metafield Reader
 * Lit les données depuis le metafield Shopify et applique l'injection directe
 * Performance maximale : 0ms de latence API
 */

(function() {
  'use strict';

  // Vérifier qu'on est bien sur une page produit
  if (!window.location.pathname.includes('/products/')) {
    return;
  }
  
  console.log('🚀 [ADLIGN METAFIELD] === LECTURE DEPUIS METAFIELD ===');
  
  // Garde-fou anti-double exécution
  if (window.AdlignMetafieldActive) {
    console.log('🔄 [ADLIGN METAFIELD] Déjà actif - skip');
    return;
  }
  window.AdlignMetafieldActive = true;
  
  // Supprimer toutes les anciennes variables
  console.log('🧹 [ADLIGN METAFIELD] Nettoyage variables...');
  delete window.AdlignActivated;
  delete window.AdlignAPIActive;
  delete window.AdlignHardcodedActive;
  delete window.AdlignIntegrationActive;
  delete window.AdlignDirectActive;
  console.log('✅ [ADLIGN METAFIELD] Variables nettoyées');

  window.Adlign = {
    data: null,
    mapping: null,
    appliedPatches: [],
    mutationObserver: null,

    init: async function() {
      await this.loadData();
      this.continueInit();
    },

    continueInit: function() {
      if (this.data && this.data.variant_data) {
        this.loadMapping();
        this.applyMetafieldInjection();
        this.setupMutationObserver();
        this.trackEvent('variant_view', {
          adlign_variant: this.data.adlign_variant,
          product_id: this.data.product_id,
          shop: this.data.shop
        });
        console.log('✅ [ADLIGN] Variante appliquée avec succès');
      } else {
        console.log('ℹ️ [ADLIGN] Aucune variante trouvée ou données manquantes');
      }
    },

    loadData: async function() {
      // 1. Essayer de charger depuis le metafield (production)
      const dataScript = document.getElementById('adlign-data');
      if (dataScript) {
        try {
          this.data = JSON.parse(dataScript.textContent);
          console.log('📖 [ADLIGN METAFIELD] Données lues depuis le metafield:', this.data);
          return;
        } catch (e) {
          console.error('❌ [ADLIGN METAFIELD] Erreur parsing des données:', e);
        }
      }

      // 2. Essayer de charger depuis l'URL (développement/démo)
      const urlParams = new URLSearchParams(window.location.search);
      const variantHandle = urlParams.get('adlign_variant');
      
      if (variantHandle) {
        console.log('🔍 [ADLIGN API] Paramètre variant détecté:', variantHandle);
        try {
          const shopDomain = window.location.hostname;
          // Utiliser un endpoint JSON au lieu de HTML
          const apiUrl = `http://localhost:3001/api/variant-data?av=${variantHandle}&shop=${shopDomain}`;
          
          const response = await fetch(apiUrl);
          if (response.ok) {
            this.data = await response.json();
            console.log('📖 [ADLIGN API] Données chargées depuis l\'API:', this.data);
            return;
          } else {
            console.error('❌ [ADLIGN API] Erreur réponse API:', response.status);
          }
        } catch (error) {
          console.error('❌ [ADLIGN API] Erreur chargement API:', error);
        }
      }

      console.warn('⚠️ [ADLIGN] Aucune source de données trouvée');
    },

    loadMapping: function() {
      // Mapping IA basé sur l'ancien système qui fonctionnait
      this.mapping = {
        title: {
          selectors: ['h1', '.product-title', '.product__title', '.product__heading h1'],
          strategy: 'text',
          fallback: true
        },
        subtitle: {
          selectors: ['.product__subtitle', '.product-subtitle', '.product__description p:first-child'],
          strategy: 'text',
          fallback: false
        },
        description_html: {
          selectors: ['.product__description', '.product-description', '.rte', '.product__content'],
          strategy: 'html',
          fallback: true
        },
        hero_image: {
          selectors: ['.product__media-item img', '.product__image img', '.main-product-image'],
          strategy: 'image_src',
          fallback: true
        },
        cta_primary: {
          selectors: ['button[type="submit"]', '[name="add"]', '.add-to-cart', '.product__cta'],
          strategy: 'text',
          fallback: true
        },
        usp_list: {
          selectors: ['.product__usp', '.product-usp', '.product__benefits'],
          strategy: 'usp_list',
          fallback: false
        },
        badges: {
          selectors: ['.product__badge', '.product-badge', '.product__tag'],
          strategy: 'badges',
          fallback: false
        }
      };
    },

    applyMetafieldInjection: function() {
      if (!this.mapping || !this.data.variant_data) {
        console.warn('❌ [ADLIGN METAFIELD] Mapping ou données manquants');
        return;
      }

      console.log('🎯 [ADLIGN METAFIELD] Application de l\'injection depuis le metafield');

      let modificationsAppliquees = 0;

      Object.entries(this.mapping).forEach(([type, mappingItem]) => {
        const variantValue = this.data.variant_data[type];

        if (variantValue === undefined || variantValue === null || variantValue === '') {
          console.log(`ℹ️ [ADLIGN METAFIELD] Pas de donnée pour '${type}' - ignoré`);
          return;
        }

        const element = this.findElement(mappingItem.selectors);
        if (element) {
          // Sécurité : ne pas modifier si c'est un élément de prix
          if (this.isPriceElement(element)) {
            console.log(`⚠️ [ADLIGN METAFIELD] ${type} - Élément prix ignoré:`, element);
            return;
          }

          // Marquer
          element.setAttribute('data-adlign-metafield', 'true');
          element.setAttribute('data-adlign-variant', this.data.adlign_variant);

          // Appliquer le changement
          this.patchElement(element, mappingItem.strategy, variantValue, type);

          // Animation
          element.style.background = 'rgba(34, 197, 94, 0.2)';
          element.style.transition = 'all 0.5s ease';
          setTimeout(() => element.style.background = '', 2000);

          modificationsAppliquees++;
          this.appliedPatches.push({ type, selector: mappingItem.selectors[0], strategy: mappingItem.strategy });
          console.log(`✨ [ADLIGN METAFIELD] ${type} modifié avec ${mappingItem.selectors[0]}`);
        } else if (mappingItem.fallback) {
          console.warn(`⚠️ [ADLIGN METAFIELD] Élément non trouvé pour '${type}' - contenu original conservé`);
        }
      });

      if (modificationsAppliquees > 0) {
        this.showSuccessNotification(modificationsAppliquees);
        console.log(`🎉 [ADLIGN METAFIELD] Succès ! ${modificationsAppliquees} modifications appliquées`);
      } else {
        console.warn(`⚠️ [ADLIGN METAFIELD] Aucune modification appliquée`);
      }

      console.log('📊 [ADLIGN METAFIELD] Patches appliqués:', this.appliedPatches);
    },

    isPriceElement: function(element) {
      return element.closest('.price') || 
             element.classList.contains('price') || 
             element.classList.contains('money') ||
             element.textContent.includes('€') || 
             element.textContent.includes('$');
    },

    findElement: function(selectors) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      }
      return null;
    },

    patchElement: function(element, strategy, value, type) {
      try {
        switch (strategy) {
          case 'text':
            element.textContent = value;
            break;
          case 'html':
            element.innerHTML = value;
            break;
          case 'image_src':
            if (element.tagName === 'IMG') {
              element.src = value;
              element.alt = `Adlign Variant - ${type}`;
            }
            break;
          case 'usp_list':
            this.applyUspList(element, value);
            break;
          case 'badges':
            this.applyBadges(element, value);
            break;
          default:
            console.warn(`⚠️ [ADLIGN METAFIELD] Stratégie inconnue: ${strategy}`);
        }
      } catch (error) {
        console.error(`❌ [ADLIGN METAFIELD] Erreur lors du patch de '${type}':`, error);
      }
    },

    applyUspList: function(container, uspList) {
      if (!Array.isArray(uspList)) return;
      
      // Vider le conteneur existant
      container.innerHTML = '';
      
      // Créer la liste des USP
      const ul = document.createElement('ul');
      ul.className = 'adlign-usp-list';
      ul.style.cssText = 'list-style: none; padding: 0; margin: 10px 0;';
      
      uspList.forEach(usp => {
        const li = document.createElement('li');
        li.textContent = usp;
        li.style.cssText = 'margin: 5px 0; padding: 5px 10px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #22c55e;';
        ul.appendChild(li);
      });
      
      container.appendChild(ul);
    },

    applyBadges: function(container, badges) {
      if (!Array.isArray(badges)) return;
      
      // Vider le conteneur existant
      container.innerHTML = '';
      
      // Créer les badges
      badges.forEach(badge => {
        const span = document.createElement('span');
        span.textContent = badge;
        span.style.cssText = 'display: inline-block; margin: 2px; padding: 4px 8px; background: #dc3545; color: white; border-radius: 12px; font-size: 12px; font-weight: bold;';
        container.appendChild(span);
      });
    },

    showSuccessNotification: function(count) {
      const notification = document.createElement('div');
      notification.innerHTML = `
        <strong>📖 ${this.data.variant_data.title || 'Variante Adlign'}</strong><br>
        <small>${count} éléments modifiés depuis le metafield</small><br>
        <small>⚡ Performance: 0ms de latence API</small>
      `;
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: linear-gradient(135deg, #22c55e, #16a34a); 
        color: white; padding: 15px 20px; border-radius: 12px; 
        font-weight: 600; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 2px solid rgba(255,255,255,0.2);
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.style.opacity = '0';
          notification.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          }, 300);
        }
      }, 5000);
    },

    setupMutationObserver: function() {
      // Observer les changements du DOM pour réappliquer le contenu si nécessaire
      this.mutationObserver = new MutationObserver((mutations) => {
        let shouldReapply = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            // Vérifier si les éléments patchés ont été modifiés
            this.appliedPatches.forEach(patch => {
              const element = document.querySelector(patch.selector);
              if (element && element.textContent !== this.data.variant_data[patch.type]) {
                shouldReapply = true;
              }
            });
          }
        });
        
        if (shouldReapply) {
          console.log('🔄 [ADLIGN METAFIELD] DOM modifié, réapplication depuis le metafield...');
          setTimeout(() => this.applyMetafieldInjection(), 100);
        }
      });
      
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    },

    trackEvent: function(eventType, payload) {
      if (!this.data || !this.data.backend_url) {
        console.warn('⚠️ [ADLIGN METAFIELD] URL backend non disponible pour le tracking');
        return;
      }

      fetch(`${this.data.backend_url}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type: eventType,
          shop: this.data.shop,
          product_id: this.data.product_id,
          timestamp: new Date().toISOString(),
          ...payload
        })
      }).catch(error => {
        console.error('❌ [ADLIGN METAFIELD] Erreur tracking:', error);
      });
    },

    destroy: function() {
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      this.appliedPatches = [];
    }
  };

  // Debug global
  window.AdlignMetafieldDebug = {
    variant: window.Adlign?.data?.adlign_variant,
    modifications: window.Adlign?.appliedPatches?.length || 0,
    active: true,
    source: 'metafield'
  };

  window.debugAdlignMetafield = function() {
    console.log('🔍 [DEBUG METAFIELD]');
    console.log('- Variant:', window.AdlignMetafieldDebug?.variant);
    console.log('- Modifications:', window.AdlignMetafieldDebug?.modifications);
    console.log('- Source:', window.AdlignMetafieldDebug?.source);
    console.log('- Éléments marqués:', document.querySelectorAll('[data-adlign-metafield="true"]').length);
    
    // Test sélecteurs
    if (window.Adlign && window.Adlign.mapping) {
      console.log('🎯 Test sélecteurs:');
      Object.entries(window.Adlign.mapping).forEach(([type, mappingItem]) => {
        console.log(`  ${type}:`);
        mappingItem.selectors.forEach(sel => {
          const count = document.querySelectorAll(sel).length;
          console.log(`    ${sel}: ${count} éléments`);
        });
      });
    }
  };

  // Auto-initialisation quand le DOM est prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.Adlign.init());
  } else {
    window.Adlign.init();
  }

  console.log('💡 [ADLIGN METAFIELD] Tapez debugAdlignMetafield() pour débugger');
  console.log('📖 [ADLIGN METAFIELD] === LECTURE DEPUIS METAFIELD TERMINÉE ===');

})();

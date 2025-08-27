// Prepare DOM elements
Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });

document.body.innerHTML = `
  <h1 id="title">Old</h1>
  <div id="desc"></div>
  <button id="cta"></button>
  <span id="badge"></span>
  <script id="adlign-data" type="application/json"></script>
`;

document.querySelector('#adlign-data').textContent = JSON.stringify({
  variant_data: {
    title: 'New Title',
    description_html: '<p>Desc</p>',
    cta_primary: 'Buy',
    promotional_badge: 'Promo'
  },
  theme_adapter: {
    selectors: {
      title: '#title',
      description: '#desc',
      add_to_cart: '#cta',
      promotional_badge: '#badge'
    }
  }
});

// Import micro-kernel (will auto-init)
require('../adlign-micro-kernel');

describe('applyVariant', () => {
  it('updates DOM elements based on variant data', () => {
    expect(document.querySelector('#title').textContent).toBe('New Title');
    expect(document.querySelector('#desc').innerHTML).toBe('<p>Desc</p>');
    expect(document.querySelector('#cta').textContent).toBe('Buy');
    expect(document.querySelector('#badge').textContent).toBe('Promo');
  });
});

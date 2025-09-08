// Shopify Product Mapping für SoundAngeles Sample Packs
export interface ShopifyProduct {
  id: string;
  name: string;
  price: string;
  handle: string;
  variantId?: string;
}

export const SHOPIFY_PRODUCTS: Record<string, ShopifyProduct> = {
  'I.L.L. Will - Drumsound Pack Vol. 1': {
    id: 'ill-will-vol-1',
    name: 'I.L.L. WILL Drumkit Vol. 1',
    price: '€4.90',
    handle: 'i-l-l-will-drumkit-vol-1'
  },
  'I.L.L. Will - Drumsound Pack Vol. 2': {
    id: 'ill-will-vol-2', 
    name: 'I.L.L. WILL Drumkit Vol. 2',
    price: '€9.90',
    handle: 'i-l-l-will-drumkit-vol-2'
  },
  'I.L.L. Will - Drumsound Pack Vol. 3': {
    id: 'ill-will-vol-3',
    name: 'I.L.L. WILL Drumkit Vol. 3', 
    price: '€9.90',
    handle: 'i-l-l-will-drumkit-vol-3'
  }
};

// Helper function to get product by sample pack name
export const getShopifyProduct = (packName: string): ShopifyProduct | null => {
  return SHOPIFY_PRODUCTS[packName] || null;
};

// Add to Cart function for iframe integration
export const addToShopifyCart = (productHandle: string): void => {
  const cartUrl = `https://soundangeles.com/cart/add?id=${productHandle}&return_to=/pages/drum-sequencer`;
  
  // If in iframe, use parent window
  if (window.parent && window.parent !== window) {
    window.parent.location.href = cartUrl;
  } else {
    // If standalone, open in same window
    window.location.href = cartUrl;
  }
};
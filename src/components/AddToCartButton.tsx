import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { getShopifyProduct, addToShopifyCart } from '@/config/shopify-products';

interface AddToCartButtonProps {
  packName: string;
  className?: string;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({ packName, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const product = getShopifyProduct(packName);
  
  if (!product) {
    return null; // Don't render if product not found
  }
  
  const handleAddToCart = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Visual feedback before redirect
      setShowSuccess(true);
      
      // Small delay for user feedback
      setTimeout(() => {
        addToShopifyCart(product.handle);
      }, 500);
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      setIsLoading(false);
      setShowSuccess(false);
    }
  };
  
  return (
    <button
      onClick={handleAddToCart}
      disabled={isLoading}
      className={`
        w-full px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200
        flex items-center justify-center gap-2
        ${showSuccess 
          ? 'bg-green-600 text-white' 
          : 'bg-black text-white hover:bg-gray-800 active:bg-gray-900'
        }
        ${isLoading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      style={{
        minHeight: '40px',
        fontSize: '13px'
      }}
    >
      {showSuccess ? (
        <>
          <span>✓ Adding...</span>
        </>
      ) : (
        <>
          <ShoppingCart size={16} />
          <span>{product.price}</span>
        </>
      )}
    </button>
  );
};

export default AddToCartButton;
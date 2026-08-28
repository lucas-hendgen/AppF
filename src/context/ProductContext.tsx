import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { api } from '../services/api';
import { INITIAL_PRODUCTS } from '../data/pharmacyData';

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  createProduct: (productData: Partial<Product>) => Promise<Product>;
  updateProduct: (id: number, updates: Partial<Product>) => Promise<Product>;
  updateProductPrice: (id: number, price: string) => Promise<Product>;
  deleteProduct: (id: number) => Promise<boolean>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('fsp_admin_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const serverProducts = await api.getProducts();
      if (serverProducts && serverProducts.length > 0) {
        setProducts(serverProducts);
        localStorage.setItem('fsp_admin_products', JSON.stringify(serverProducts));
      }
    } catch (err: any) {
      console.warn('Usando catálogo local / fallback:', err);
      const saved = localStorage.getItem('fsp_admin_products');
      if (saved) {
        setProducts(JSON.parse(saved));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const createProduct = async (productData: Partial<Product>): Promise<Product> => {
    try {
      const created = await api.createProduct(productData);
      setProducts(prev => {
        const updated = [created, ...prev.filter(p => p.id !== created.id)];
        localStorage.setItem('fsp_admin_products', JSON.stringify(updated));
        return updated;
      });
      return created;
    } catch (err: any) {
      // Fallback local se a API estiver offline
      const newProd: Product = {
        id: Date.now(),
        sku: productData.sku || `PROD${Math.floor(100 + Math.random() * 900)}`,
        nome: productData.nome || 'Novo Item',
        categoria: productData.categoria || 'medicamentos',
        preco: productData.preco || '19,90',
        descricao: productData.descricao || '',
        status: productData.status || 'Ativo',
        classificacaoAdicional: productData.classificacaoAdicional || '',
        observacoes: productData.observacoes || '',
        imagem: productData.imagem || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
      };
      setProducts(prev => {
        const updated = [newProd, ...prev];
        localStorage.setItem('fsp_admin_products', JSON.stringify(updated));
        return updated;
      });
      return newProd;
    }
  };

  const updateProduct = async (id: number, updates: Partial<Product>): Promise<Product> => {
    try {
      const updated = await api.updateProduct(id, updates);
      setProducts(prev => {
        const newList = prev.map(p => (p.id === id ? { ...p, ...updated } : p));
        localStorage.setItem('fsp_admin_products', JSON.stringify(newList));
        return newList;
      });
      return updated;
    } catch (err: any) {
      // Fallback local
      let localUpdated: Product | null = null;
      setProducts(prev => {
        const newList = prev.map(p => {
          if (p.id === id) {
            localUpdated = { ...p, ...updates };
            return localUpdated;
          }
          return p;
        });
        localStorage.setItem('fsp_admin_products', JSON.stringify(newList));
        return newList;
      });
      if (!localUpdated) throw new Error('Produto não encontrado.');
      return localUpdated;
    }
  };

  const updateProductPrice = async (id: number, price: string): Promise<Product> => {
    try {
      const updated = await api.updateProductPrice(id, price);
      setProducts(prev => {
        const newList = prev.map(p => (p.id === id ? { ...p, preco: updated.preco } : p));
        localStorage.setItem('fsp_admin_products', JSON.stringify(newList));
        return newList;
      });
      return updated;
    } catch (err) {
      let localUpdated: Product | null = null;
      setProducts(prev => {
        const newList = prev.map(p => {
          if (p.id === id) {
            localUpdated = { ...p, preco: price };
            return localUpdated;
          }
          return p;
        });
        localStorage.setItem('fsp_admin_products', JSON.stringify(newList));
        return newList;
      });
      if (!localUpdated) throw new Error('Produto não encontrado.');
      return localUpdated;
    }
  };

  const deleteProduct = async (id: number): Promise<boolean> => {
    try {
      await api.deleteProduct(id);
    } catch (err) {
      console.warn('Erro ao deletar no servidor, deletando localmente:', err);
    }
    setProducts(prev => {
      const newList = prev.filter(p => p.id !== id);
      localStorage.setItem('fsp_admin_products', JSON.stringify(newList));
      return newList;
    });
    return true;
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        isLoading,
        error,
        refreshProducts,
        createProduct,
        updateProduct,
        updateProductPrice,
        deleteProduct
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts deve ser utilizado dentro de um ProductProvider');
  }
  return context;
};

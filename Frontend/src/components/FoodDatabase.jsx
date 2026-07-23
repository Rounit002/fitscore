import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Database, Search, Sparkles, Utensils } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../api/client.js';

export default function FoodDatabase({ authToken, onBack, onSelectProduct }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useTranslation();







  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadProducts = async () => {
      setIsLoading(true);
      setError('');

      try {
        const query = searchTerm.trim()
          ? `?search=${encodeURIComponent(searchTerm.trim())}`
          : '';
        const response = await fetch(
          `${API}/scans/database${query}`,
          { credentials: 'include', signal: controller.signal }
        );

        if (!response.ok) throw new Error('Failed to load products');
        const localData = await response.json();
        let nextProducts = Array.isArray(localData) ? localData : [];

        if (isMounted) setProducts(nextProducts);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          console.error(loadError);
          if (isMounted) setError(t('could_not_load'));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadProducts, searchTerm ? 650 : 0);

    return () => {
      isMounted = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [searchTerm, t]);

  const productCountLabel = useMemo(() => {
    if (isLoading) return t('loading_products');
    if (products.length === 1) return '1 packaged product';
    return `${products.length} packaged products`;
  }, [isLoading, products.length, t]);

  const getProductImage = (product) => {
    const rawProductData = product.rawProductData || product.raw_product_data || {};
    return product.image_url
      || rawProductData.image_front_small_url
      || rawProductData.image_front_url
      || rawProductData.image_small_url
      || rawProductData.image_url
      || null;
  };

  return (
    <div className="food-db-page">
      <section className="food-db-shell" aria-label="Food database">
        <header className="food-db-header">
          <button type="button" onClick={onBack} aria-label="Back to dashboard">
            <ArrowLeft size={20} />
          </button>
          <div>
            <span>NutriScore</span>
            <h1>{t('food_db_title')}</h1>
          </div>
          <Database size={22} />
        </header>

        <section className="food-db-hero">
          <div>
            <strong>{productCountLabel}</strong>
            <p>Search packaged foods from the web and products scanned by NutriScore users, then analyze one for your own health profile.</p>
          </div>
          <Sparkles size={24} />
        </section>

        <div className="food-db-search">
          <Search size={18} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('search_scanned_product')}
            aria-label="Search scanned products"
          />
        </div>

        {error && <p className="food-db-error">{error}</p>}

        <div className="food-db-list" aria-label="Scanned products">
          {isLoading ? (
            Array.from({ length: 5 }, (_, index) => (
              <div className="food-db-skeleton" key={index} />
            ))
          ) : products.length ? (
            products.map((product) => {
              const productImage = getProductImage(product);

              return (
                <button
                  className="food-db-card"
                  key={`${product.brands}-${product.product_name}-${product.id}`}
                  type="button"
                  onClick={() => onSelectProduct(product)}
                >
                  <span className="food-db-mark">
                    {productImage ? (
                      <img src={productImage} alt="" loading="lazy" />
                    ) : (
                      <Utensils size={18} />
                    )}
                  </span>
                  <span className="food-db-copy">
                    <strong>{product.product_name || t('unknown_product')}</strong>
                    <small>{product.brands || t('unknown_brand')}</small>
                  </span>
                  <span className={`food-db-score ${product.latest_score ? '' : 'is-online'}`}>
                    {product.latest_score || 'WEB'}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="food-db-empty">
              <Database size={28} />
              <strong>{t('no_products_found_db')}</strong>
              <span>{t('try_another_search')}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

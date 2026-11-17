import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  schemaType?: 'LocalBusiness' | 'Product';
  schemaData?: Record<string, any>;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title = 'Deep Root Farms - Premium Certified Horticulture & Fruit Cultivars',
  description = 'Certified grafted fruit varieties, robust rootstocks, and verified pedigree saplings for professional growers.',
  keywords = 'horticulture, nursery, grafted plants, mango, guava, rootstocks, plant pedigree',
  image = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
  url = 'https://deeprootfarms.local',
  schemaType = 'LocalBusiness',
  schemaData,
}) => {
  const fullTitle = title.includes('Deep Root Farms') ? title : `${title} | Deep Root Farms`;

  const structuredData =
    schemaType === 'Product' && schemaData
      ? {
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: schemaData.name,
          image: schemaData.images || [image],
          description: schemaData.description || description,
          brand: {
            '@type': 'Brand',
            name: 'Deep Root Farms',
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'INR',
            price: schemaData.price || '0',
            availability:
              schemaData.availability === 'In Stock'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: 'Deep Root Farms',
            },
          },
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Deep Root Farms',
          description: description,
          image: image,
          telephone: '+91 98765 43210',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Survey No. 108, Riverside Highway, Agri Zone',
            addressCountry: 'IN',
          },
          url: url,
          priceRange: '₹₹',
        };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* OpenGraph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={schemaType === 'Product' ? 'product' : 'website'} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
};

export default SeoHead;


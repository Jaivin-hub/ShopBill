import { useEffect } from 'react';

/**
 * SEO Component for dynamic meta tag management
 * Updates document head with SEO-friendly meta tags based on page content
 */
const SEO = ({ 
  title = 'Pocket POS - #1 Retail Management Tool',
  description = 'Pocket POS - The #1 retail management software for Indian shops. Lightning-fast billing, real-time inventory management, digital Khata ledger, GST billing, and business reports.',
  keywords = 'Pocket POS, retail management software, billing app, inventory tracker, digital khata, GST billing, point of sale India, POS software',
  image = '/covermain.png',
  url = 'https://yourdomain.com',
  type = 'website',
  noindex = false
}) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name, content, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update description
    updateMetaTag('description', description);
    
    // Update keywords
    updateMetaTag('keywords', keywords);

    // Update robots
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', url + image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);

    // Twitter Card tags
    updateMetaTag('twitter:title', title, true);
    updateMetaTag('twitter:description', description, true);
    updateMetaTag('twitter:image', url + image, true);
    updateMetaTag('twitter:card', 'summary_large_image', true);

    // Update canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

  }, [title, description, keywords, image, url, type, noindex]);

  return null;
};

export default SEO;




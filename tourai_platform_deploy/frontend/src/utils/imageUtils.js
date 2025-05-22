import React from 'react';

/**
 * Image utilities for optimized loading
 */

/**
 * Lazily loads an image using the Intersection Observer API
 * 
 * @param {string} src - The source URL of the image
 * @param {string} placeholderSrc - A smaller placeholder image URL
 * @param {function} onLoad - Callback function when image is loaded
 * @returns {object} - Object containing image src and loading status
 */
export const useLazyImage = (src, placeholderSrc, onLoad = () => {}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholderSrc || '');
  const [imageRef, setImageRef] = React.useState();
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    let observer;
    let didCancel = false;

    if (imageRef && src) {
      if (IntersectionObserver) {
        observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (
                !didCancel &&
                (entry.intersectionRatio > 0 || entry.isIntersecting)
              ) {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                  if (!didCancel) {
                    setImageSrc(src);
                    setIsLoaded(true);
                    onLoad();
                  }
                };
                observer.unobserve(imageRef);
              }
            });
          },
          {
            threshold: 0.01,
            rootMargin: '75%'
          }
        );
        observer.observe(imageRef);
      } else {
        // Fallback for browsers that don't support IntersectionObserver
        setImageSrc(src);
        setIsLoaded(true);
        onLoad();
      }
    }

    return () => {
      didCancel = true;
      if (observer && observer.unobserve && imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [src, imageRef, onLoad]);

  return { imageSrc, isLoaded, setImageRef };
};

/**
 * Creates a responsive image srcset string
 * 
 * @param {string} baseUrl - Base URL of the image
 * @param {Array} sizes - Array of size objects with width and suffix
 * @returns {string} - Formatted srcset string
 */
export const createSrcSet = (baseUrl, sizes) => {
  if (!baseUrl || !sizes || !sizes.length) return '';
  
  const extension = baseUrl.split('.').pop();
  const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('.'));
  
  return sizes
    .map(size => `${basePath}${size.suffix}.${extension} ${size.width}w`)
    .join(', ');
};

/**
 * Converts an image to WebP format with fallback
 * 
 * @param {string} imageUrl - Original image URL
 * @returns {object} - Object containing srcset and fallback src
 */
export const getOptimizedImageSources = (imageUrl) => {
  if (!imageUrl) return { src: '', srcset: '', fallbackSrc: '' };
  
  const extension = imageUrl.split('.').pop();
  const basePath = imageUrl.substring(0, imageUrl.lastIndexOf('.'));
  
  // For WebP support
  const webpSrcset = createSrcSet(`${basePath}.webp`, [
    { width: 400, suffix: '-small' },
    { width: 800, suffix: '-medium' },
    { width: 1200, suffix: '-large' }
  ]);
  
  // Fallback for browsers without WebP support
  const fallbackSrcset = createSrcSet(imageUrl, [
    { width: 400, suffix: '-small' },
    { width: 800, suffix: '-medium' },
    { width: 1200, suffix: '-large' }
  ]);
  
  return {
    srcset: webpSrcset,
    fallbackSrc: imageUrl,
    fallbackSrcset: fallbackSrcset
  };
}; 
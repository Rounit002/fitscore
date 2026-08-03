export const BRAND_LOGO_SRC = '/icons/icon-192.png';

export default function BrandLogo({ className = '', alt = 'bitezsnap', ...props }) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      className={className}
      alt={alt}
      decoding="async"
      draggable="false"
      {...props}
    />
  );
}

import logoUrl from '../../parinaya_logo.png';

/** The shared brand asset, bundled by Vite for every customer and admin route. */
export function BrandLogo({className = '', decorative = false}: {className?: string; decorative?: boolean}) {
  return <img src={logoUrl} alt={decorative ? '' : 'Parinaya Silks logo'} width={2000} height={2000} className={className} style={{objectFit: 'contain', flexShrink: 0}}/>;
}

// Ilustrações e ícones desenhados em SVG (sem imagens externas).

type P = { className?: string };

export function Hero({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 260 170" role="img" aria-label="Calendário com sol nascendo às 8h e um sino tocando">
      {/* sol nascendo */}
      <circle cx="70" cy="70" r="44" fill="#FFD25E" />
      <g stroke="#FFB627" strokeWidth="6" strokeLinecap="round">
        <path d="M70 8v10M18 70h10M33 33l7 7M107 33l-7 7" />
      </g>
      {/* nuvenzinha */}
      <path d="M18 128c0-9 8-15 16-13 3-8 15-10 20-2 8-1 14 5 13 13H18z" fill="#FFFFFF" opacity=".9" />
      {/* folha de calendário */}
      <g transform="rotate(-6 150 95)">
        <rect x="92" y="34" width="116" height="112" rx="18" fill="#FFFFFF" />
        <path d="M92 52a18 18 0 0 1 18-18h80a18 18 0 0 1 18 18v10H92z" fill="#FF6B6B" />
        <rect x="118" y="24" width="10" height="22" rx="5" fill="#2D3A5A" />
        <rect x="172" y="24" width="10" height="22" rx="5" fill="#2D3A5A" />
        <text x="150" y="118" textAnchor="middle" fontSize="44" fontWeight="800" fill="#2D3A5A" fontFamily="ui-rounded, system-ui, sans-serif">8h</text>
        <circle cx="114" cy="134" r="4" fill="#5EC2B7" />
        <circle cx="128" cy="134" r="4" fill="#FFD25E" />
        <circle cx="142" cy="134" r="4" fill="#7C8CF8" />
      </g>
      {/* sino */}
      <g transform="rotate(16 222 70)">
        <path d="M222 40c-15 0-24 12-24 27v14l-7 9h62l-7-9V67c0-15-9-27-24-27z" fill="#FFB627" />
        <circle cx="222" cy="96" r="7" fill="#FF8C42" />
        <rect x="218" y="32" width="8" height="10" rx="4" fill="#FF8C42" />
      </g>
      <g stroke="#FF8C42" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M250 46c5 6 6 14 3 22M244 30c9 9 12 22 7 35" />
      </g>
      {/* brilhos */}
      <g fill="#7C8CF8">
        <path d="M232 128l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
        <path d="M28 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </g>
    </svg>
  );
}

export function Microfone({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#FFE3E3" />
      <rect x="18" y="9" width="12" height="20" rx="6" fill="#FF6B6B" />
      <path d="M13 23a11 11 0 0 0 22 0M24 34v6M18 40h12" stroke="#E04848" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Arquivos({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 96 72" aria-hidden="true">
      {/* PDF */}
      <g transform="rotate(-10 30 40)">
        <path d="M14 12h26l10 10v40H14z" fill="#FFFFFF" stroke="#FF6B6B" strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 12v10h10" fill="#FFE3E3" stroke="#FF6B6B" strokeWidth="3" strokeLinejoin="round" />
        <rect x="19" y="34" width="22" height="10" rx="3" fill="#FF6B6B" />
        <text x="30" y="42" textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">PDF</text>
        <path d="M20 52h22" stroke="#FFC2C2" strokeWidth="3" strokeLinecap="round" />
      </g>
      {/* foto */}
      <g transform="rotate(8 66 38)">
        <rect x="46" y="14" width="40" height="46" rx="6" fill="#FFFFFF" stroke="#4C7DF0" strokeWidth="3" />
        <rect x="51" y="19" width="30" height="26" rx="3" fill="#DCE8FF" />
        <circle cx="74" cy="26" r="4" fill="#FFD25E" />
        <path d="M51 45l10-12 8 8 5-5 7 9z" fill="#5EC2B7" />
      </g>
      {/* seta de enviar */}
      <circle cx="48" cy="62" r="9" fill="#7C8CF8" />
      <path d="M48 67v-9M44 61l4-4 4 4" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Lapis({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#ECEBFF" />
      <path d="M14 34l3-9 15-15 6 6-15 15z" fill="#7C8CF8" />
      <path d="M32 10l6 6 2-2a3 3 0 0 0 0-4l-2-2a3 3 0 0 0-4 0z" fill="#FF8C42" />
      <path d="M14 34l3-9 6 6z" fill="#FFD25E" />
    </svg>
  );
}

export function Lupa({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#DCE8FF" />
      <circle cx="21" cy="21" r="9" fill="#FFFFFF" stroke="#4C7DF0" strokeWidth="3.5" />
      <path d="M28 28l8 8" stroke="#4C7DF0" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function CalendarioOk({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#D9F4EF" />
      <rect x="11" y="13" width="26" height="24" rx="5" fill="#FFFFFF" stroke="#2FA594" strokeWidth="3" />
      <path d="M11 20h26" stroke="#2FA594" strokeWidth="3" />
      <path d="M18 28l4 4 8-8" stroke="#2FA594" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Sol({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="7" fill="#FFB627" />
      <g stroke="#FFB627" strokeWidth="2.6" strokeLinecap="round">
        <path d="M16 2v4M16 26v4M2 16h4M26 16h4M6 6l3 3M23 23l3 3M26 6l-3 3M9 23l-3 3" />
      </g>
    </svg>
  );
}

export function Sino({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 5c-6 0-9 5-9 10v5l-3 4h24l-3-4v-5c0-5-3-10-9-10z" fill="#FF8C42" />
      <circle cx="16" cy="27" r="3" fill="#E06A1F" />
    </svg>
  );
}

export function Festa({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 120 80" aria-hidden="true">
      <g>
        <rect x="10" y="12" width="8" height="4" rx="2" fill="#FF6B6B" transform="rotate(30 14 14)" />
        <rect x="100" y="10" width="8" height="4" rx="2" fill="#7C8CF8" transform="rotate(-25 104 12)" />
        <rect x="22" y="58" width="8" height="4" rx="2" fill="#FFB627" transform="rotate(-40 26 60)" />
        <rect x="92" y="60" width="8" height="4" rx="2" fill="#5EC2B7" transform="rotate(40 96 62)" />
        <circle cx="30" cy="30" r="3" fill="#5EC2B7" />
        <circle cx="92" cy="34" r="3" fill="#FF6B6B" />
        <circle cx="16" cy="44" r="2.5" fill="#7C8CF8" />
        <circle cx="106" cy="46" r="2.5" fill="#FFB627" />
      </g>
      <circle cx="60" cy="40" r="28" fill="#2FA594" />
      <path d="M47 41l9 9 18-18" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Vazio({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 120 70" aria-hidden="true">
      <rect x="30" y="10" width="60" height="50" rx="10" fill="#F1F4FB" stroke="#C9D3EA" strokeWidth="2.5" strokeDasharray="6 5" />
      <path d="M44 30h32M44 40h20" stroke="#C9D3EA" strokeWidth="4" strokeLinecap="round" />
      <path d="M96 16l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FFD25E" />
    </svg>
  );
}

import React, { useId } from "react";

interface EcovisLogoProps {
  className?: string;
}

export function EcovisLogo({ className = "h-6 w-auto" }: EcovisLogoProps) {
  const rawId = useId();
  const clipId = `ecovis-circle-clip-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 96"
      className={className}
      role="img"
      aria-label="ECOVIS®"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="48" cy="48" r="42" />
        </clipPath>
      </defs>
      {/* Símbolo circular vermelho com recortes brancos */}
      <g clipPath={`url(#${clipId})`}>
        <circle cx="48" cy="48" r="42" fill="#C41E3A" />
        {/* Faixa horizontal superior e inferior */}
        <rect x="0" y="38" width="96" height="5.5" fill="#FFFFFF" />
        <rect x="0" y="48.5" width="96" height="5.5" fill="#FFFFFF" />
        {/* Arco branco cortando a metade direita */}
        <path
          d="M 74 4 C 46 20, 46 76, 74 92"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>
      {/* Tipografia oficial ECOVIS® em cinza */}
      <text
        x="108"
        y="64"
        fill="#9E9B9B"
        fontFamily="'Inter', 'Segoe UI', Arial, sans-serif"
        fontSize="47"
        fontWeight="400"
        letterSpacing="5.5"
      >
        ECOVIS
      </text>
      <text
        x="331"
        y="34"
        fill="#9E9B9B"
        fontFamily="'Inter', 'Segoe UI', Arial, sans-serif"
        fontSize="16"
        fontWeight="600"
      >
        ®
      </text>
    </svg>
  );
}

"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputClass, labelClass } from "@/components/ui";

export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  bloquearColar = false,
  className = "mb-4",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  bloquearColar?: boolean;
  className?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className={className}>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          type={visivel ? "text" : "password"}
          required
          minLength={6}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={bloquearColar ? (e) => e.preventDefault() : undefined}
          className={`${inputClass} pr-10`}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          tabIndex={-1}
          title={visivel ? "Esconder senha" : "Mostrar senha"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
        >
          {visivel ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

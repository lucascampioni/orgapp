"use client";

import { useRef, useState } from "react";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { SEXOS } from "@/lib/sexo";
import type { Sexo } from "@/lib/types";

export default function PerfilForm({
  nome: nomeInicial,
  dataNascimento: dataNascimentoInicial,
  sexo: sexoInicial,
  fotoUrl,
  onSave,
  onUploadFoto,
}: {
  nome: string;
  dataNascimento: string | null;
  sexo: Sexo | null;
  fotoUrl: string | null;
  onSave: (fields: { nome: string; data_nascimento: string | null; sexo: Sexo | null }) => Promise<void>;
  onUploadFoto: (file: File) => Promise<void>;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [dataNascimento, setDataNascimento] = useState(dataNascimentoInicial ?? "");
  const [sexo, setSexo] = useState<Sexo | "">(sexoInicial ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSalvar() {
    if (!nome.trim()) return;
    setSaving(true);
    setMsg(null);
    await onSave({
      nome: nome.trim(),
      data_nascimento: dataNascimento || null,
      sexo: sexo || null,
    });
    setSaving(false);
    setMsg("Perfil atualizado.");
  }

  async function handleFotoSelecionada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoFoto(true);
    await onUploadFoto(file);
    setEnviandoFoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-semibold text-ink">Meu perfil</h1>

      <div className="mb-5 flex items-center gap-4">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoUrl} alt="Foto de perfil" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2 text-2xl text-muted">
            {nome.trim().charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFotoSelecionada}
            className="hidden"
            id="foto-perfil-input"
          />
          <label
            htmlFor="foto-perfil-input"
            className="inline-block cursor-pointer rounded-lg border border-border px-3 py-1.5 text-[13px] text-muted transition hover:text-ink"
          >
            {enviandoFoto ? "Enviando..." : fotoUrl ? "Trocar foto" : "Adicionar foto"}
          </label>
        </div>
      </div>

      <label className={labelClass}>Nome</label>
      <input value={nome} onChange={(e) => setNome(e.target.value)} className={`mb-3 ${inputClass}`} />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Data de nascimento</label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Sexo</label>
          <select value={sexo} onChange={(e) => setSexo(e.target.value as Sexo | "")} className={inputClass}>
            <option value="">Não informado</option>
            {SEXOS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button onClick={handleSalvar} disabled={saving || !nome.trim()} className={primaryButtonClass}>
        {saving ? "Salvando..." : "Salvar"}
      </button>
      {msg && <span className="ml-3 text-xs text-success">{msg}</span>}
    </div>
  );
}

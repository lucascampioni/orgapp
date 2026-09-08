"use client";

import { useSyncExternalStore } from "react";
import type { Aluno } from "@/lib/types";

const CHAVE = "lumina_aluno_ativo";
const listeners = new Set<() => void>();

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function selecionarAlunoAtivo(id: string) {
  try {
    localStorage.setItem(CHAVE, id);
  } catch {
    // localStorage pode falhar em modo privado - a seleção só não persiste.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Guarda qual aluno está selecionado (quando o mesmo login tem mais de um
 * vínculo, ex: um responsável com dois filhos) no localStorage, pra manter
 * a seleção ao navegar entre as páginas do portal do aluno - cada página é
 * uma rota separada, então não dá pra guardar isso só em estado do React.
 * Mesmo padrão do ThemeToggle (useSyncExternalStore em vez de useEffect +
 * setState, que o eslint-plugin-react-hooks rejeita).
 */
export function useAlunoAtivo(alunos: Aluno[]): [string, (id: string) => void] {
  const salvo = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const alunoAtivoId = salvo && alunos.some((a) => a.id === salvo) ? salvo : (alunos[0]?.id ?? "");
  return [alunoAtivoId, selecionarAlunoAtivo];
}

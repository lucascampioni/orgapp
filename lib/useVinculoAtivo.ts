"use client";

import { useSyncExternalStore } from "react";
import type { AlunoProfessor } from "@/lib/types";

const CHAVE = "lumina_vinculo_ativo";
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

function selecionarVinculoAtivo(professorId: string) {
  try {
    localStorage.setItem(CHAVE, professorId);
  } catch {
    // localStorage pode falhar em modo privado - a seleção só não persiste.
  }
  listeners.forEach((listener) => listener());
}

/**
 * Guarda qual vínculo (professora + idioma) está selecionado no
 * localStorage, pra manter a seleção ao navegar entre as páginas do
 * portal do aluno - cada página é uma rota separada, então não dá pra
 * guardar isso só em estado do React. Guarda o professor_id (é isso que
 * filtra aulas/vocabulário/pagamentos/erros, que têm professor_id próprio -
 * o aluno em si é sempre o mesmo, só o vínculo muda). Mesmo padrão do
 * ThemeToggle (useSyncExternalStore em vez de useEffect + setState, que o
 * eslint-plugin-react-hooks rejeita).
 */
export function useVinculoAtivo(vinculos: AlunoProfessor[]): [string, (professorId: string) => void] {
  const salvo = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const professorIdAtivo =
    salvo && vinculos.some((v) => v.professor_id === salvo) ? salvo : (vinculos[0]?.professor_id ?? "");
  return [professorIdAtivo, selecionarVinculoAtivo];
}

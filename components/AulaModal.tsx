"use client";

import { useState } from "react";
import type { Aluno, Aula, AulaStatus, ErroAula, TarefaAula, Turma, Vocabulario } from "@/lib/types";
import {
  ModalShell,
  dangerLinkClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { CATEGORIA_ERRO_LABEL } from "@/lib/erros";

export default function AulaModal({
  aula,
  alunos,
  turmas,
  tarefas,
  vocabulario,
  erros,
  onClose,
  onSave,
  onIniciarGravacao,
  onRefresh,
  onReprocessar,
  onToggleTarefa,
  onAddTarefa,
  onRemoveTarefa,
  onRemoveAula,
}: {
  aula: Aula;
  alunos: Aluno[];
  turmas: Turma[];
  tarefas: TarefaAula[];
  vocabulario: Vocabulario[];
  erros: ErroAula[];
  onClose: () => void;
  onSave: (fields: Partial<Aula>) => Promise<void>;
  onIniciarGravacao: () => Promise<string | null>;
  onRefresh: () => Promise<void>;
  onReprocessar: () => Promise<string | null>;
  onToggleTarefa: (tarefa: TarefaAula) => void;
  onAddTarefa: (descricao: string) => void;
  onRemoveTarefa: (id: string) => void;
  onRemoveAula: () => void;
}) {
  const [titulo, setTitulo] = useState(aula.titulo);
  const [alunoId, setAlunoId] = useState(aula.aluno_id ?? "");
  const [turmaId, setTurmaId] = useState(aula.turma_id ?? "");
  const [data, setData] = useState(aula.data ?? "");
  const [horario, setHorario] = useState(aula.horario ?? "");
  const [status, setStatus] = useState<AulaStatus>(aula.status);
  const [objetivo, setObjetivo] = useState(aula.objetivo ?? "");
  const [conteudo, setConteudo] = useState(aula.conteudo ?? "");
  const [meetLink, setMeetLink] = useState(aula.meet_link ?? "");
  const [saving, setSaving] = useState(false);
  const [gravacaoLoading, setGravacaoLoading] = useState(false);
  const [gravacaoErro, setGravacaoErro] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reprocessando, setReprocessando] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState("");

  async function handleSave() {
    setSaving(true);
    await onSave({
      titulo: titulo.trim() || aula.titulo,
      aluno_id: alunoId || null,
      turma_id: turmaId || null,
      data: data || null,
      horario: horario.trim() || null,
      status,
      objetivo: objetivo.trim() || null,
      conteudo: conteudo.trim() || null,
      meet_link: meetLink.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  async function handleIniciarGravacao() {
    setGravacaoLoading(true);
    setGravacaoErro(null);
    const erro = await onIniciarGravacao();
    setGravacaoLoading(false);
    if (erro) setGravacaoErro(erro);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  async function handleReprocessar() {
    setReprocessando(true);
    setGravacaoErro(null);
    const erro = await onReprocessar();
    setReprocessando(false);
    if (erro) setGravacaoErro(erro);
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={`font-display text-[16px] font-bold ${inputClass}`}
        />
        <button onClick={onClose} title="Fechar" className="text-muted hover:text-ink">
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={alunoId}
          onChange={(e) => setAlunoId(e.target.value)}
          className={`flex-1 ${inputClass}`}
        >
          <option value="">Sem aluno</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          className={inputClass}
        >
          <option value="">Sem turma</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={inputClass}
        />
        <input
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AulaStatus)}
          className={inputClass}
        >
          <option value="planejada">Planejada</option>
          <option value="dada">Dada</option>
        </select>
      </div>

      <label className={labelClass}>Objetivo da aula</label>
      <textarea
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        rows={2}
        placeholder="O que o aluno deve aprender..."
        className={`mb-3 resize-none ${inputClass}`}
      />

      <label className={labelClass}>Conteúdo / plano</label>
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={6}
        placeholder="Atividades, materiais, anotações..."
        className={`mb-3 resize-none ${inputClass}`}
      />

      <label className={labelClass}>Link do Google Meet</label>
      <input
        value={meetLink}
        onChange={(e) => setMeetLink(e.target.value)}
        placeholder="https://meet.google.com/..."
        className={`mb-4 ${inputClass}`}
      />

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className={secondaryButtonClass}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">Gravação com IA</span>
          {(aula.recall_bot_id || aula.resumo_ia) && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-muted transition hover:text-ink"
            >
              {refreshing ? "Atualizando..." : "↻ Atualizar"}
            </button>
          )}
        </div>

        {!aula.meet_link && (
          <p className="text-xs text-muted">
            Salve um link do Google Meet acima para poder gravar essa aula com IA.
          </p>
        )}

        {aula.meet_link && !aula.recall_bot_id && (
          <>
            <p className="mb-2 text-xs text-muted">
              {aula.data && aula.horario
                ? "O bot entra sozinho 1 minuto antes do horário marcado. Se quiser começar agora mesmo, use o botão abaixo."
                : "Defina data e horário acima pra o bot entrar sozinho, ou adicione manualmente agora."}
            </p>
            <button onClick={handleIniciarGravacao} disabled={gravacaoLoading} className={primaryButtonClass}>
              {gravacaoLoading ? "Iniciando..." : "🎥 Adicionar manualmente agora"}
            </button>
          </>
        )}

        {gravacaoErro && <p className="mt-2 text-xs text-danger">{gravacaoErro}</p>}

        {aula.recall_bot_id && !aula.resumo_ia && (
          <p className="text-xs text-muted">
            Bot agendado para essa aula (entra sozinho 1 min antes do horário, ou já pode ter
            entrado). O resumo aparece aqui automaticamente quando a aula terminar (clique em
            Atualizar pra checar).
          </p>
        )}

        {aula.resumo_ia && (
          <div className="mb-3 rounded-lg border border-border bg-surface-2 p-3 text-sm text-ink">
            {aula.resumo_ia}
          </div>
        )}

        {aula.recall_bot_id && (
          <button
            onClick={handleReprocessar}
            disabled={reprocessando}
            className="mb-3 text-xs text-muted transition hover:text-ink"
          >
            {reprocessando ? "Reprocessando..." : "↻ Reprocessar com IA"}
          </button>
        )}

        {aula.topicos && aula.topicos.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 text-xs font-medium text-muted">Tópicos abordados</div>
            <div className="flex flex-wrap gap-1.5">
              {aula.topicos.map((topico) => (
                <span
                  key={topico}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
                >
                  {topico}
                </span>
              ))}
            </div>
          </div>
        )}

        {erros.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 text-xs font-medium text-muted">Erros identificados</div>
            <div className="flex flex-col gap-2">
              {erros.map((e) => (
                <div key={e.id} className="rounded-lg border border-border bg-surface-2 p-2.5">
                  <div className="text-sm text-danger line-through">{e.frase_original}</div>
                  {e.correcao && <div className="text-sm text-ink">{e.correcao}</div>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {e.categoria && (
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted">
                        {CATEGORIA_ERRO_LABEL[e.categoria]}
                      </span>
                    )}
                    {e.explicacao && <span className="text-xs text-muted">{e.explicacao}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {((aula.pontos_positivos && aula.pontos_positivos.length > 0) ||
          (aula.pontos_melhorar && aula.pontos_melhorar.length > 0)) && (
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {aula.pontos_positivos && aula.pontos_positivos.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted">Pontos positivos</div>
                <ul className="list-inside list-disc text-sm text-ink">
                  {aula.pontos_positivos.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {aula.pontos_melhorar && aula.pontos_melhorar.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted">Pontos a melhorar</div>
                <ul className="list-inside list-disc text-sm text-ink">
                  {aula.pontos_melhorar.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {aula.sugestao_ia && (
          <div className="mb-3 rounded-lg border border-brand/40 bg-surface-2 p-3 text-sm text-ink">
            <span className="mr-1 text-xs font-medium text-brand">Sugestão da IA:</span>
            {aula.sugestao_ia}
          </div>
        )}

        {vocabulario.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 text-xs font-medium text-muted">Vocabulário novo identificado</div>
            <div className="flex flex-wrap gap-1.5">
              {vocabulario.map((v) => (
                <span
                  key={v.id}
                  title={v.significado ?? undefined}
                  className="rounded-full border border-teal px-2 py-0.5 text-[11px] text-teal"
                >
                  {v.termo}
                </span>
              ))}
            </div>
          </div>
        )}

        {tarefas.length > 0 && (
          <div className="flex flex-col gap-2">
            {tarefas.map((t) => (
              <TarefaRow key={t.id} tarefa={t} onToggle={() => onToggleTarefa(t)} onRemove={() => onRemoveTarefa(t.id)} />
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!novaTarefa.trim()) return;
            onAddTarefa(novaTarefa.trim());
            setNovaTarefa("");
          }}
          className="mt-2 flex gap-1.5"
        >
          <input
            value={novaTarefa}
            onChange={(e) => setNovaTarefa(e.target.value)}
            placeholder="Adicionar tarefa manualmente..."
            className={`flex-1 ${inputClass}`}
          />
          <button type="submit" disabled={!novaTarefa.trim()} className={secondaryButtonClass}>
            + Adicionar
          </button>
        </form>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <button onClick={onRemoveAula} className={dangerLinkClass}>
          Excluir aula
        </button>
      </div>
    </ModalShell>
  );
}

function TarefaRow({
  tarefa,
  onToggle,
  onRemove,
}: {
  tarefa: TarefaAula;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-2.5">
      <div className="flex items-center gap-2">
        {tarefa.tipo === "checklist" && (
          <input type="checkbox" checked={tarefa.concluida} onChange={onToggle} className="h-4 w-4" />
        )}
        <span
          className={`flex-1 text-sm ${tarefa.concluida ? "text-muted line-through" : "text-ink"}`}
        >
          {tarefa.descricao}
        </span>
        {tarefa.tipo !== "checklist" && (
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted">
            {tarefa.resposta_aluno ? "respondida" : "aguardando resposta"}
          </span>
        )}
        <button onClick={onRemove} title="Remover" className="text-muted hover:text-danger">
          ✕
        </button>
      </div>

      {tarefa.tipo === "dissertativa" && (
        <div className="mt-2 rounded-md bg-surface px-2 py-1.5 text-xs text-ink">
          {tarefa.resposta_aluno ? tarefa.resposta_aluno : (
            <span className="text-muted">O aluno ainda não respondeu.</span>
          )}
        </div>
      )}

      {tarefa.tipo === "multipla_escolha" && tarefa.opcoes && tarefa.opcoes.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {tarefa.opcoes.map((opcao) => {
            const escolhida = tarefa.resposta_aluno === opcao;
            const correta = tarefa.resposta_correta === opcao;
            return (
              <div
                key={opcao}
                className={`rounded-md px-2 py-1 text-xs ${
                  escolhida && correta
                    ? "bg-success/15 text-success"
                    : escolhida
                      ? "bg-danger/15 text-danger"
                      : correta
                        ? "text-success"
                        : "text-muted"
                }`}
              >
                {escolhida ? "● " : "○ "}
                {opcao}
                {correta ? " (correta)" : ""}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

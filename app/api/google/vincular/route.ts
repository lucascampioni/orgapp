import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { googleRecurringEventId, alunoId, titulo } = (await request.json()) as {
    googleRecurringEventId?: string;
    alunoId?: string;
    titulo?: string;
  };

  if (!googleRecurringEventId || !alunoId) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("google_vinculos")
    .upsert(
      {
        professor_id: user.id,
        aluno_id: alunoId,
        google_recurring_event_id: googleRecurringEventId,
        titulo: titulo ?? null,
      },
      { onConflict: "professor_id,google_recurring_event_id" },
    )
    .select()
    .single();

  if (error || !data) {
    console.error("Falha ao vincular evento do Google", error);
    return NextResponse.json({ error: error?.message ?? "Falha ao vincular" }, { status: 500 });
  }

  return NextResponse.json({ vinculo: data });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }

  const { error } = await supabase.from("google_vinculos").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

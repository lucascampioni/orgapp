import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Board from "@/components/Board";
import type { Task } from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .order("criado_em", { ascending: true });

  return (
    <Board initialTasks={(tasks as Task[]) ?? []} userEmail={user.email ?? ""} />
  );
}

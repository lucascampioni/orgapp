import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Sobe a foto de perfil pro bucket "avatars" em "<userId>/avatar.<ext>"
 * (upsert - troca a foto em vez de acumular arquivo velho) e devolve a URL
 * pública com um carimbo de tempo (?t=...) pra invalidar cache do
 * navegador, já que o path continua sendo o mesmo de antes.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<string | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) {
    console.error("Falha ao subir foto de perfil", error);
    return null;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

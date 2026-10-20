import EsqueciSenhaForm from "@/components/EsqueciSenhaForm";

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const erroInicial =
    erro === "link_invalido" ? "Esse link expirou ou já foi usado - peça um novo abaixo." : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: "var(--color-brand)" }}
      />
      <EsqueciSenhaForm erroInicial={erroInicial} />
    </main>
  );
}

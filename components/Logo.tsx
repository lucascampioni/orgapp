export default function Logo({
  size = "md",
  withWordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
}) {
  const dims = { sm: 22, md: 28, lg: 36 }[size];
  const textSize = { sm: "text-base", md: "text-lg", lg: "text-2xl" }[size];

  return (
    <div className="flex items-center gap-2">
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="16" cy="16" r="7" fill="var(--color-brand)" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="15"
            y="1.5"
            width="2"
            height="5"
            rx="1"
            fill="var(--color-brand)"
            opacity="0.85"
            transform={`rotate(${deg} 16 16)`}
          />
        ))}
      </svg>
      {withWordmark && (
        <span className={`font-display font-semibold tracking-tight text-ink ${textSize}`}>
          Lumina
        </span>
      )}
    </div>
  );
}

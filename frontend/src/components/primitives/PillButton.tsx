import type { ButtonHTMLAttributes } from "react";

type PillButtonTone = "neutral" | "danger" | "accent";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: PillButtonTone;
}

export function PillButton({
  children,
  className = "",
  tone = "neutral",
  type = "button",
  ...props
}: PillButtonProps) {
  return (
    <button
      className={["cozo-pill-button", `is-${tone}`, className].filter(Boolean).join(" ")}
      data-part="pill-button"
      data-tone={tone}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

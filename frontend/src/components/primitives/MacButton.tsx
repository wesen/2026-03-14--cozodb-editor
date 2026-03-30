import type { ButtonHTMLAttributes } from "react";

type MacButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function MacButton({ children, className = "", type = "button", ...props }: MacButtonProps) {
  return (
    <button
      className={["mac-btn", className].filter(Boolean).join(" ")}
      data-part="mac-button"
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

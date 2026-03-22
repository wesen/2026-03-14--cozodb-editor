import type { HTMLAttributes } from "react";

type ActionRowProps = HTMLAttributes<HTMLDivElement>;

export function ActionRow({ children, className = "", ...props }: ActionRowProps) {
  return (
    <div
      className={["cozo-action-row", className].filter(Boolean).join(" ")}
      data-part="action-row"
      {...props}
    >
      {children}
    </div>
  );
}

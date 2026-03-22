import type { HTMLAttributes } from "react";

type SectionLabelProps = HTMLAttributes<HTMLDivElement>;

export function SectionLabel({ children, className = "", ...props }: SectionLabelProps) {
  return (
    <div
      className={["cozo-section-label", className].filter(Boolean).join(" ")}
      data-part="section-label"
      {...props}
    >
      {children}
    </div>
  );
}

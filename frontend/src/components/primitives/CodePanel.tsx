import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

interface CodePanelProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode;
  preserveWhitespace?: boolean;
}

export function CodePanel({
  action,
  children,
  className = "",
  preserveWhitespace = true,
  style,
  ...props
}: CodePanelProps) {
  return (
    <div
      className={["cozo-code-panel", "cozo-code-panel--primitive", className].filter(Boolean).join(" ")}
      data-part="code-panel"
      style={{ ...(preserveWhitespace ? ({ whiteSpace: "pre-wrap" } satisfies CSSProperties) : null), ...style }}
      {...props}
    >
      {action ? (
        <div className="cozo-code-panel__action" data-part="code-panel-action">
          {action}
        </div>
      ) : null}
      <div className="cozo-code-panel__content" data-part="code-panel-content">
        {children}
      </div>
    </div>
  );
}

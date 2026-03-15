import katex from "katex";

interface MathFormulaProps {
  expression: string;
  displayMode?: boolean;
  className?: string;
}

function stripDelimiters(expression: string) {
  const trimmed = expression.trim();
  if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
    return { latex: trimmed.slice(2, -2).trim(), displayMode: true };
  }
  if (trimmed.startsWith("$") && trimmed.endsWith("$")) {
    return { latex: trimmed.slice(1, -1).trim(), displayMode: false };
  }
  return { latex: trimmed, displayMode: undefined };
}

export function MathFormula({
  expression,
  displayMode,
  className,
}: MathFormulaProps) {
  const parsed = stripDelimiters(expression);
  const mode = displayMode ?? parsed.displayMode ?? true;

  let html = expression;
  let hasError = false;

  try {
    html = katex.renderToString(parsed.latex, {
      displayMode: mode,
      throwOnError: false,
      strict: "ignore",
    });
  } catch {
    hasError = true;
  }

  if (hasError) {
    return <span className={className}>{expression}</span>;
  }

  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

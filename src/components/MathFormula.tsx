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

function normalizeDisplayLatex(latex: string, displayMode: boolean) {
  if (!displayMode) {
    return latex;
  }

  const normalized = latex.replace(/\n+/g, " ").trim();
  const separators = normalized.split(/\\qquad|\\quad/).map((part) => part.trim());

  if (separators.length <= 1) {
    return normalized;
  }

  const aligned = separators
    .map((part) => {
      const equalIndex = part.indexOf("=");
      if (equalIndex === -1) {
        return part;
      }
      return `${part.slice(0, equalIndex)}&=${part.slice(equalIndex + 1)}`;
    })
    .join(" \\\\ ");

  return `\\begin{aligned}${aligned}\\end{aligned}`;
}

export function MathFormula({
  expression,
  displayMode,
  className,
}: MathFormulaProps) {
  const parsed = stripDelimiters(expression);
  const mode = displayMode ?? parsed.displayMode ?? true;
  const latex = normalizeDisplayLatex(parsed.latex, mode);

  let html = expression;
  let hasError = false;

  try {
    html = katex.renderToString(latex, {
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

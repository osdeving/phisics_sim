import { Fragment, ReactNode, useMemo } from "react";
import { MathFormula } from "./MathFormula";

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "formula"; expression: string };

function renderInline(text: string) {
  const parts = text.split(
    /(\$\$[^$\n]+\$\$|\$[^$\n]+\$|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g,
  );

  return parts
    .filter(Boolean)
    .map((part, index): ReactNode => {
      const inlineFormulaMatch = part.match(/^\$\$?[^$\n]+\$\$?$/);
      if (inlineFormulaMatch) {
        return (
          <MathFormula
            key={`${part}-${index}`}
            expression={part}
            displayMode={false}
            className="markdown-inline-math"
          />
        );
      }

      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        return (
          <a
            key={`${part}-${index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="tutorial-link"
          >
            {linkMatch[1]}
          </a>
        );
      }

      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
      }

      return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
    });
}

function parseMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  const pushParagraph = (buffer: string[]) => {
    if (buffer.length > 0) {
      blocks.push({
        type: "paragraph",
        text: buffer.join(" ").trim(),
      });
      buffer.length = 0;
    }
  };

  const paragraphBuffer: string[] = [];

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      pushParagraph(paragraphBuffer);
      index += 1;
      continue;
    }

    if (line === "$$") {
      pushParagraph(paragraphBuffer);
      const formulaLines: string[] = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== "$$") {
        formulaLines.push(lines[index]);
        index += 1;
      }
      blocks.push({
        type: "formula",
        expression: `$$${formulaLines.join("\n").trim()}$$`,
      });
      index += 1;
      continue;
    }

    if (line.startsWith("$$") && line.endsWith("$$")) {
      pushParagraph(paragraphBuffer);
      blocks.push({
        type: "formula",
        expression: line,
      });
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      pushParagraph(paragraphBuffer);
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2],
      });
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      pushParagraph(paragraphBuffer);
      blocks.push({
        type: "quote",
        text: line.slice(2).trim(),
      });
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      pushParagraph(paragraphBuffer);
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      pushParagraph(paragraphBuffer);
      const items: string[] = [];
      while (index < lines.length) {
        const match = lines[index].trim().match(/^\d+\.\s+(.+)$/);
        if (!match) {
          break;
        }
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    paragraphBuffer.push(line);
    index += 1;
  }

  pushParagraph(paragraphBuffer);
  return blocks;
}

interface MarkdownDocumentProps {
  markdown: string;
}

export function MarkdownDocument({ markdown }: MarkdownDocumentProps) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <div className="markdown-document">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = `h${Math.min(block.level + 1, 4)}` as "h2" | "h3" | "h4";
          return <HeadingTag key={`${block.type}-${index}`}>{block.text}</HeadingTag>;
        }

        if (block.type === "paragraph") {
          return <p key={`${block.type}-${index}`}>{renderInline(block.text)}</p>;
        }

        if (block.type === "quote") {
          return <blockquote key={`${block.type}-${index}`}>{renderInline(block.text)}</blockquote>;
        }

        if (block.type === "formula") {
          return (
            <div key={`${block.type}-${index}`} className="tutorial-formula tutorial-formula--markdown">
              <MathFormula expression={block.expression} displayMode />
            </div>
          );
        }

        if (block.type === "ul") {
          return (
            <ul key={`${block.type}-${index}`}>
              {block.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        return (
          <ol key={`${block.type}-${index}`}>
            {block.items.map((item) => (
              <li key={item}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}

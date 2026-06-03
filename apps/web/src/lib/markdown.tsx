import type { ReactNode } from "react";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; code: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

interface IndexedMarkdownHeading extends MarkdownHeading {
  blockIndex: number;
}

const headingClasses: Record<number, string> = {
  1: "text-3xl font-semibold tracking-tight",
  2: "mt-10 border-t border-line pt-8 text-2xl font-semibold",
  3: "mt-7 text-xl font-semibold",
  4: "mt-5 text-lg font-semibold"
};

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  return createHeadingIndex(parseMarkdown(markdown));
}

export function renderMarkdown(markdown: string): ReactNode[] {
  const blocks = parseMarkdown(markdown);
  const headingIds = new Map<number, string>();

  createHeadingIndex(blocks).forEach((heading) => {
    headingIds.set(heading.blockIndex, heading.id);
  });

  return blocks.map((block, index) => renderBlock(block, index, headingIds.get(index)));
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ type: "code", code: codeLines.join("\n") });
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const marker = heading[1] ?? "#";
      const text = heading[2] ?? "";
      blocks.push({
        type: "heading",
        level: marker.length,
        text
      });
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines: string[] = [];
      while (index < lines.length && (lines[index] ?? "").trim().startsWith("|")) {
        tableLines.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push(parseTable(tableLines));
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^-\s+/.test((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^-\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && isParagraphLine(lines, index)) {
      paragraphLines.push((lines[index] ?? "").trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return blocks;
}

function isParagraphLine(lines: string[], index: number) {
  const trimmed = (lines[index] ?? "").trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("```")) return false;
  if (/^(#{1,4})\s+/.test(trimmed)) return false;
  if (/^-\s+/.test(trimmed)) return false;
  if (/^\d+\.\s+/.test(trimmed)) return false;
  if (isTableStart(lines, index)) return false;
  return true;
}

function isTableStart(lines: string[], index: number) {
  const current = (lines[index] ?? "").trim();
  const next = (lines[index + 1] ?? "").trim();
  return current.startsWith("|") && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next);
}

function parseTable(lines: string[]): Block {
  const [headerLine, _separator, ...rowLines] = lines;
  return {
    type: "table",
    headers: splitTableRow(headerLine ?? ""),
    rows: rowLines.map(splitTableRow)
  };
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderBlock(block: Block, index: number, headingId?: string) {
  if (block.type === "heading") {
    const className = headingClasses[block.level] ?? headingClasses[4];
    const headingProps = {
      id: headingId,
      className: `${className} scroll-mt-6`
    };
    if (block.level === 1) {
      return (
        <h1 key={index} {...headingProps}>
          {renderInline(block.text)}
        </h1>
      );
    }
    if (block.level === 2) {
      return (
        <h2 key={index} {...headingProps}>
          {renderInline(block.text)}
        </h2>
      );
    }
    if (block.level === 3) {
      return (
        <h3 key={index} {...headingProps}>
          {renderInline(block.text)}
        </h3>
      );
    }
    return (
      <h4 key={index} {...headingProps}>
        {renderInline(block.text)}
      </h4>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p key={index} className="mt-4 leading-7 text-neutral-700">
        {renderInline(block.lines.join(" "))}
      </p>
    );
  }

  if (block.type === "ul") {
    return (
      <ul key={index} className="mt-4 list-disc space-y-2 pl-6 leading-7 text-neutral-700">
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "ol") {
    return (
      <ol key={index} className="mt-4 list-decimal space-y-2 pl-6 leading-7 text-neutral-700">
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </ol>
    );
  }

  if (block.type === "code") {
    return (
      <pre key={index} className="mt-4 overflow-x-auto rounded-md bg-ink p-4 text-sm text-white">
        <code>{block.code}</code>
      </pre>
    );
  }

  return (
    <div key={index} className="mt-4 overflow-x-auto rounded-md border border-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface text-ink">
          <tr>
            {block.headers.map((header, headerIndex) => (
              <th key={headerIndex} className="border-b border-line px-3 py-2 font-semibold">
                {renderInline(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-line last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top text-neutral-700">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function createHeadingIndex(blocks: Block[]): IndexedMarkdownHeading[] {
  const used = new Map<string, number>();
  return blocks.flatMap((block, blockIndex) => {
    if (block.type !== "heading") return [];

    const baseId = slugify(block.text) || `section-${blockIndex + 1}`;
    const count = used.get(baseId) ?? 0;
    used.set(baseId, count + 1);

    return {
      ...block,
      blockIndex,
      id: count === 0 ? baseId : `${baseId}-${count + 1}`
    };
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-surface px-1.5 py-0.5 font-mono text-sm text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

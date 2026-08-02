import type { ReactNode } from "react";

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "blockquote"; lines: string[] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[]; start: number }
  | { type: "code"; code: string }
  | { type: "hr" }
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
  1: "text-4xl font-extrabold tracking-[-0.04em] text-ink",
  2: "mt-14 border-t border-line/70 pt-10 text-3xl font-extrabold tracking-[-0.03em] text-ink",
  3: "mt-9 text-xl font-extrabold tracking-[-0.02em] text-ink",
  4: "mt-7 text-lg font-extrabold text-ink"
};

interface RenderMarkdownOptions {
  omitTitle?: boolean;
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  return createHeadingIndex(parseMarkdown(markdown));
}

export function renderMarkdown(
  markdown: string,
  options: RenderMarkdownOptions = {}
): ReactNode[] {
  const blocks = parseMarkdown(markdown);
  const headingIds = new Map<number, string>();
  const introductionIndex = blocks.findIndex((block) => block.type === "paragraph");

  createHeadingIndex(blocks).forEach((heading) => {
    headingIds.set(heading.blockIndex, heading.id);
  });

  return blocks.flatMap((block, index) => {
    if (options.omitTitle && block.type === "heading" && block.level === 1) {
      return [];
    }
    return [renderBlock(block, index, headingIds.get(index), index === introductionIndex)];
  });
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

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test((lines[index] ?? "").trim())) {
        quoteLines.push((lines[index] ?? "").trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", lines: quoteLines });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr" });
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
      const start = Number(trimmed.match(/^(\d+)\./)?.[1] ?? "1");
      while (index < lines.length && /^\d+\.\s+/.test((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "ol", items, start });
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
  if (/^>\s?/.test(trimmed)) return false;
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return false;
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

function renderBlock(
  block: Block,
  index: number,
  headingId?: string,
  introduction = false
) {
  if (block.type === "heading") {
    const className = headingClasses[block.level] ?? headingClasses[4];
    const headingProps = {
      id: headingId,
      className: `${className} scroll-mt-28 text-balance`
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
      <p
        key={index}
        className={
          introduction
            ? "text-lg leading-8 text-muted"
            : "mt-4 leading-7 text-muted"
        }
      >
        {renderInline(block.lines.join(" "))}
      </p>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        key={index}
        className="mt-5 rounded-xl bg-[#e8effe] px-5 py-4 font-medium leading-7 text-ink"
      >
        {renderInline(block.lines.join(" "))}
      </blockquote>
    );
  }

  if (block.type === "ul") {
    return (
      <ul
        key={index}
        className="mt-4 list-disc space-y-2.5 pl-6 leading-7 text-muted marker:font-bold marker:text-journey"
      >
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "ol") {
    return (
      <ol
        key={index}
        start={block.start}
        className="mt-4 list-decimal space-y-2.5 pl-6 leading-7 text-muted marker:font-extrabold marker:text-journey"
      >
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </ol>
    );
  }

  if (block.type === "code") {
    return (
      <pre
        key={index}
        className="mt-5 overflow-x-auto rounded-xl bg-ink p-5 text-sm leading-6 text-white shadow-[0_12px_28px_rgba(5,18,45,.14)]"
      >
        <code>{block.code}</code>
      </pre>
    );
  }

  if (block.type === "hr") {
    return <hr key={index} className="my-10 border-line/70" />;
  }

  return (
    <div
      key={index}
      className="mt-5 overflow-x-auto rounded-xl border border-line/70"
      tabIndex={0}
      role="region"
      aria-label="Таблица из правил игры"
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-ink text-white">
          <tr>
            {block.headers.map((header, headerIndex) => (
              <th key={headerIndex} className="px-4 py-3 font-extrabold">
                {renderInline(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-line/70 last:border-b-0 even:bg-card/60">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top leading-6 text-muted">
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
  const parts = text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded-md bg-card px-1.5 py-0.5 font-mono text-sm text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-extrabold text-ink">{part.slice(2, -2)}</strong>;
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
      return (
        <a
          key={index}
          href={href}
          className="font-bold text-journey underline decoration-journey/35 underline-offset-2 transition hover:decoration-journey focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noreferrer" : undefined}
        >
          {label}
        </a>
      );
    }

    return part;
  });
}

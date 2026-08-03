import type { Metadata, Route } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText } from "lucide-react";
import { materials } from "./content";

export const metadata: Metadata = {
  title: "Материалы о финансовых играх | Financial Journey",
  description: "Практические материалы о финансовых играх, ходе партии и организации совместной игры.",
  alternates: { canonical: "/materials" },
  openGraph: {
    title: "Материалы о финансовых играх",
    description: "Практические материалы о финансовых играх, ходе партии и организации совместной игры.",
    url: "/materials",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Материалы о финансовых играх",
    description: "Практические материалы о финансовых играх, ходе партии и организации совместной игры."
  }
};

export default function MaterialsPage() {
  return (
    <main className="material-shell material-index">
      <header className="material-header">
        <Link className="material-brand" href="/">Financial Journey</Link>
        <nav aria-label="Основная навигация"><Link href="/guide">Правила игры</Link><Link className="material-header-action" href="/login">Начать игру</Link></nav>
      </header>
      <section className="material-index-hero">
        <BookOpenText aria-hidden="true" />
        <h1>Разобраться в финансовой игре до первого хода</h1>
        <p>Короткие и содержательные материалы о решениях, правилах и организации совместной партии.</p>
      </section>
      <section className="material-list" aria-label="Список материалов">
        {materials.map((material, index) => (
          <Link key={material.slug} href={`/materials/${material.slug}` as Route}>
            <span className="material-list-number">{String(index + 1).padStart(2, "0")}</span>
            <div><span>{material.readTime}</span><h2>{material.title}</h2><p>{material.summary}</p></div>
            <ArrowRight aria-hidden="true" />
          </Link>
        ))}
      </section>
      <footer className="material-footer"><Link href="/">Вернуться на главную</Link><p>© 2026 Financial Journey</p></footer>
    </main>
  );
}

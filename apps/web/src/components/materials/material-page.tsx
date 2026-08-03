import type { Route } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { materials, type MaterialSlug } from "@/app/materials/content";
import { publicSiteUrl } from "@/lib/site";
import { CookieSettingsLink } from "@/components/analytics/cookie-settings-link";

type Section = {
  heading: string;
  paragraphs?: string[];
  items?: string[];
};

type MaterialPageProps = {
  slug: MaterialSlug;
  intro: string;
  sections: Section[];
  takeaway: string;
};

export function MaterialPage({ slug, intro, sections, takeaway }: MaterialPageProps) {
  const material = materials.find((item) => item.slug === slug)!;
  const related = materials.filter((item) => item.slug !== slug);
  const url = `${publicSiteUrl}/materials/${slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: material.title,
        description: material.description,
        inLanguage: "ru-RU",
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: "Financial Journey", url: publicSiteUrl }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Главная", item: `${publicSiteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Материалы", item: `${publicSiteUrl}/materials` },
          { "@type": "ListItem", position: 3, name: material.title, item: url }
        ]
      }
    ]
  };

  return (
    <main className="material-shell">
      <header className="material-header">
        <Link className="material-brand" href="/">Financial Journey</Link>
        <nav aria-label="Навигация по материалам">
          <Link href={"/materials" as Route}>Все материалы</Link>
          <Link className="material-header-action" href="/login">Начать игру</Link>
        </nav>
      </header>

      <article className="material-article">
        <div className="material-breadcrumbs" aria-label="Хлебные крошки">
          <Link href="/">Главная</Link><span aria-hidden="true">/</span>
          <Link href={"/materials" as Route}>Материалы</Link>
        </div>
        <div className="material-hero">
          <p className="material-read-time">{material.readTime} на чтение</p>
          <h1>{material.title}</h1>
          <p>{intro}</p>
        </div>

        <div className="material-body">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
            </section>
          ))}
          <aside className="material-takeaway">
            <h2>Главная мысль</h2>
            <p>{takeaway}</p>
          </aside>
        </div>
      </article>

      <section className="material-related" aria-labelledby="related-title">
        <h2 id="related-title">Продолжить путешествие</h2>
        <div>
          {related.map((item) => (
            <Link key={item.slug} href={`/materials/${item.slug}` as Route}>
              <span>{item.readTime}</span><strong>{item.title}</strong><p>{item.summary}</p>
              <ArrowRight aria-hidden="true" size={20} />
            </Link>
          ))}
        </div>
      </section>

      <footer className="material-footer">
        <Link href={"/materials" as Route}><ArrowLeft aria-hidden="true" size={18} />Все материалы</Link>
        <CookieSettingsLink />
        <p>Материалы носят образовательный характер и не являются финансовой рекомендацией.</p>
      </footer>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}

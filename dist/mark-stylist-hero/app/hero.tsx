"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";

const SITE_URL = "https://markarzhannikov.ru";

type MotionItemProps = {
  children: ReactNode;
  className: string;
  delay?: number;
  depth?: number;
  mobile?: boolean;
};

function MotionItem({
  children,
  className,
  delay = 0,
  depth = 0,
  mobile = false,
}: MotionItemProps) {
  return (
    <div
      className={`motion-item ${className}`}
      data-depth={depth || undefined}
      data-enter={mobile ? undefined : ""}
      data-reveal={mobile ? "" : undefined}
      style={{ "--delay": `${delay}ms` } as CSSProperties}
    >
      <div className="reveal-content">{children}</div>
    </div>
  );
}

function DesktopHeader() {
  return (
    <header className="desktop-header" aria-label="Основная навигация">
      <MotionItem className="desktop-kicker" delay={20}>
        <span>Мужской стилист</span>
      </MotionItem>
      <MotionItem className="desktop-brand" delay={70}>
        <a href={SITE_URL} aria-label="Марк Аржанников — главная">
          Марк Аржанников
        </a>
      </MotionItem>
      <MotionItem className="desktop-nav" delay={120}>
        <nav>
          <a href={`${SITE_URL}/#about`}>Марк</a>
          <a href={`${SITE_URL}/#works`}>Работы</a>
          <a href={`${SITE_URL}/#booking`}>Запись</a>
        </nav>
      </MotionItem>
    </header>
  );
}

function MobileHeader() {
  return (
    <header className="mobile-header" aria-label="Основная навигация">
      <MotionItem className="mobile-brand" delay={0} mobile>
        <a href={SITE_URL} aria-label="Марк Аржанников — главная">
          <span>Мужской стилист</span>
          <strong>Марк Аржанников</strong>
        </a>
      </MotionItem>
      <MotionItem className="mobile-nav" delay={50} mobile>
        <a href={`${SITE_URL}/#about`}>Марк</a>
      </MotionItem>
    </header>
  );
}

function Portrait({ src, alt }: { src: string; alt: string }) {
  // These art-directed WebP files are already cropped and compressed for the
  // Figma composition, so a plain image preserves their exact rendering.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} draggable={false} />;
}

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const frame = requestAnimationFrame(() => root.classList.add("is-ready"));
    const mobileItems = Array.from(
      root.querySelectorAll<HTMLElement>(".mobile-hero [data-reveal]"),
    );

    if (reduceMotion) {
      mobileItems.forEach((item) => item.classList.add("is-visible"));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -7% 0px" },
    );
    mobileItems.forEach((item) => observer.observe(item));

    const depthItems = Array.from(
      root.querySelectorAll<HTMLElement>(".mobile-hero [data-depth]"),
    );
    let ticking = false;
    const updateParallax = () => {
      const scroll = Math.max(0, window.scrollY);
      depthItems.forEach((item) => {
        const depth = Number(item.dataset.depth ?? 0);
        const offset = Math.max(-72, Math.min(72, scroll * depth));
        item.style.setProperty("--parallax", `${offset}px`);
      });
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateParallax);
    };
    updateParallax();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <main ref={rootRef} className="hero-root">
      <h1 className="sr-only">
        Правильная стрижка меняет твой день, а значит и жизнь!
      </h1>

      <section className="desktop-hero" aria-label="Марк Аржанников — мужской стилист">
        <div className="desktop-canvas">
          <DesktopHeader />

          <MotionItem className="display-text d-correct" delay={130}>
            <span aria-hidden="true">Правильная</span>
          </MotionItem>
          <MotionItem className="display-text display-black d-haircut" delay={210}>
            <span aria-hidden="true">стрижка</span>
          </MotionItem>
          <MotionItem className="display-text d-changes" delay={320}>
            <span aria-hidden="true">меняет</span>
          </MotionItem>
          <MotionItem className="display-text display-black d-your" delay={420}>
            <span aria-hidden="true">твой</span>
          </MotionItem>
          <MotionItem className="display-text d-day" delay={540}>
            <span aria-hidden="true">день,</span>
          </MotionItem>
          <MotionItem className="display-text d-therefore" delay={620}>
            <span aria-hidden="true">а значит</span>
          </MotionItem>
          <MotionItem className="display-text display-black d-life" delay={730}>
            <span aria-hidden="true">и жизнь!</span>
          </MotionItem>

          <MotionItem className="portrait d-image-1" delay={170}>
            <Portrait src="/hero-1.webp" alt="Клиент Марка с короткой светлой стрижкой" />
          </MotionItem>
          <MotionItem className="portrait d-image-2" delay={280}>
            <Portrait src="/hero-2.webp" alt="Мужская стрижка с объёмной формой" />
          </MotionItem>
          <MotionItem className="portrait d-image-4" delay={470}>
            <Portrait src="/hero-4.webp" alt="Классическая мужская стрижка" />
          </MotionItem>
          <MotionItem className="portrait d-image-6" delay={580}>
            <Portrait src="/hero-6.webp" alt="Мужская стрижка и оформление бороды" />
          </MotionItem>
          <MotionItem className="portrait d-image-5" delay={690}>
            <Portrait src="/hero-5.webp" alt="Короткая текстурная стрижка" />
          </MotionItem>
          <MotionItem className="portrait d-image-3" delay={810}>
            <Portrait src="/hero-3.webp" alt="Марк Аржанников в студии" />
          </MotionItem>
        </div>
      </section>

      <section className="mobile-hero" aria-label="Марк Аржанников — мужской стилист">
        <div className="mobile-canvas">
          <MobileHeader />

          <MotionItem className="display-text m-correct" delay={80} depth={-0.008} mobile>
            <span aria-hidden="true">Правильная</span>
          </MotionItem>
          <MotionItem className="display-text display-black m-haircut" delay={140} depth={0.012} mobile>
            <span aria-hidden="true">стрижка</span>
          </MotionItem>
          <MotionItem className="portrait m-image-1" delay={210} depth={-0.018} mobile>
            <Portrait src="/hero-1.webp" alt="Клиент Марка с короткой светлой стрижкой" />
          </MotionItem>
          <MotionItem className="display-text m-changes" delay={30} depth={0.022} mobile>
            <span aria-hidden="true">меняет</span>
          </MotionItem>
          <MotionItem className="display-text display-black m-your" delay={70} depth={-0.016} mobile>
            <span aria-hidden="true">твой</span>
          </MotionItem>
          <MotionItem className="portrait m-image-2" delay={120} depth={0.032} mobile>
            <Portrait src="/hero-2.webp" alt="Мужская стрижка с объёмной формой" />
          </MotionItem>
          <MotionItem className="display-text m-day" delay={60} depth={-0.024} mobile>
            <span aria-hidden="true">день,</span>
          </MotionItem>
          <MotionItem className="portrait m-image-4" delay={110} depth={0.016} mobile>
            <Portrait src="/hero-4.webp" alt="Классическая мужская стрижка" />
          </MotionItem>
          <MotionItem className="portrait m-image-5" delay={40} depth={-0.035} mobile>
            <Portrait src="/hero-5.webp" alt="Короткая текстурная стрижка" />
          </MotionItem>
          <MotionItem className="display-text m-therefore" delay={100} depth={0.026} mobile>
            <span aria-hidden="true">а значит</span>
          </MotionItem>
          <MotionItem className="display-text display-black m-life" delay={40} depth={-0.012} mobile>
            <span aria-hidden="true">и жизнь!</span>
          </MotionItem>
          <MotionItem className="portrait m-image-6" delay={90} depth={0.034} mobile>
            <Portrait src="/hero-6.webp" alt="Мужская стрижка и оформление бороды" />
          </MotionItem>
          <MotionItem className="portrait m-image-3" delay={130} depth={-0.028} mobile>
            <Portrait src="/hero-3.webp" alt="Марк Аржанников в студии" />
          </MotionItem>
        </div>
      </section>
    </main>
  );
}

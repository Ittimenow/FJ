import { Check, Circle, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

const readinessRows = [
  { label: "В команде достаточно игроков", complete: true },
  { label: "Все фигурки выбраны", complete: true },
  { label: "Ведущий запускает партию", complete: false }
];

const variants = [
  {
    name: "Белая поверхность",
    note: "Чистая и максимально лёгкая",
    surface: "border border-line bg-white",
    icon: "bg-[#e8effe] text-journey",
    row: "bg-card"
  },
  {
    name: "Тёплая карточка",
    note: "Фирменный пергаментный характер",
    surface: "border border-line bg-card",
    icon: "bg-[#ffead7] text-[#a54f16]",
    row: "bg-white"
  },
  {
    name: "Мягкая синяя",
    note: "Спокойно отделяет служебную информацию",
    surface: "border border-[#d8e2f4] bg-[#f1f5fd]",
    icon: "bg-[#dce7fb] text-journey",
    row: "bg-white/80"
  }
] as const;

export default function DesignPreviewPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-ink sm:px-6 sm:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="max-w-3xl">
          <h1 className="text-balance text-3xl font-extrabold tracking-[-0.035em] sm:text-5xl">
            Соберите команду
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Три лёгких решения из дизайн-системы: нейтральное, тёплое и структурное.
            Оранжевый используется только для главного действия.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3 lg:items-start">
          {variants.map((variant) => (
            <section key={variant.name} aria-labelledby={`variant-${variant.name}`}>
              <div className="mb-3 px-1">
                <h2 id={`variant-${variant.name}`} className="text-lg font-extrabold">
                  {variant.name}
                </h2>
                <p className="mt-1 text-sm text-muted">{variant.note}</p>
              </div>

              <div className={`rounded-2xl p-5 sm:p-6 ${variant.surface}`}>
                <div className="flex items-start gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${variant.icon}`} aria-hidden="true">
                    <UsersRound size={21} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xl font-extrabold tracking-[-0.025em]">
                      Готовность к старту
                    </h3>
                    <p className="mt-1 text-sm text-muted">Выполнено 2 из 3 условий</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2" role="img" aria-label="Выполнено два из трёх условий">
                  <span className="h-2 rounded-full bg-[#7c9a45]" />
                  <span className="h-2 rounded-full bg-[#7c9a45]" />
                  <span className="h-2 rounded-full bg-[#d9e0e8]" />
                </div>

                <ul className="mt-5 space-y-2.5">
                  {readinessRows.map((row) => (
                    <li key={row.label} className={`flex min-h-14 items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold ${variant.row}`}>
                      <span
                        className={[
                          "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                          row.complete
                            ? "bg-[#7c9a45] text-white"
                            : "bg-[#fff0df] text-[#9a582b]"
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        {row.complete ? <Check size={15} strokeWidth={3} /> : <Circle size={7} fill="currentColor" />}
                      </span>
                      <span>{row.label}</span>
                      <span className="sr-only">{row.complete ? "выполнено" : "ожидается"}</span>
                    </li>
                  ))}
                </ul>

                <Button variant="action" className="mt-5 h-12 w-full">
                  Начать игру
                </Button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

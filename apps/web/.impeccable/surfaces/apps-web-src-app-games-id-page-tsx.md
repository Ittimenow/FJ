---
version: 1
slug: "apps-web-src-app-games-id-page-tsx"
primary_target: "apps/web/src/app/games/[id]/page.tsx"
related_targets: ["apps/web/src/components/game/game-room.tsx","apps/web/src/app/dashboard/page.tsx","apps/web/src/app/profile/page.tsx"]
---

Scope: закрытая игровая комната и связанная оболочка кабинета. Mode: Operate.

Audience: ведущий проводит живую партию; игроки следят за единым состоянием. Primary task: быстро увидеть текущий ход, выполнить следующее действие и проверить последствия для финансов и партии.

Direction: утверждён вариант A — центральное поле, финансовая и пользовательская информация слева, текущий ход и действия справа, история событий снизу. Approved comp: `.impeccable/mocks/game-room-option-a.png`.

Constraints: сохранять существующую игровую логику, роли и плотность данных; оранжевый означает немедленное действие; состояния не различаются только цветом; mobile использует компактные вкладки без горизонтального расширения страницы.

Implementation inventory: глобальная навигация и контролы — semantic HTML/CSS и lucide-react; поле и игровые данные — существующие компоненты; композиция — CSS grid; изображения фигурок — существующие assets; иллюстративное поле из компа не переносится буквально.

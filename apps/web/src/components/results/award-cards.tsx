import Image from "next/image";
import { Trophy } from "lucide-react";
import type { GameAward } from "@/lib/types";
import { awardImagePath } from "@/lib/award-image";

type Award = Pick<GameAward, "kind" | "title" | "playerName" | "mention" | "result">;

export function AwardCards({
  awards,
  layout = "page",
  playerLabel = "name"
}: {
  awards: Award[];
  layout?: "dialog" | "page";
  playerLabel?: "name" | "mention";
}) {
  return (
    <ol className={layout === "dialog" ? "grid gap-3 sm:grid-cols-2" : "grid gap-2 md:grid-cols-2 xl:grid-cols-3"}>
      {awards.map((award) => {
        const image = awardImagePath(award.kind);
        const player = playerLabel === "mention" ? award.mention : award.playerName;
        return (
          <li key={award.kind} className={layout === "dialog" ? "flex min-h-[250px] min-w-0 items-stretch sm:min-h-[270px]" : "flex min-h-[158px] min-w-0 items-stretch sm:min-h-[180px]"}>
            <div className={layout === "dialog" ? "flex w-[43%] shrink-0 items-center justify-center py-3" : "flex w-[40%] shrink-0 items-center justify-center py-1"}>
              {image ? (
                <Image src={image} width={512} height={512} alt="" className={layout === "dialog" ? "max-h-[226px] w-full object-contain sm:max-h-[246px]" : "max-h-[150px] w-full object-contain sm:max-h-[172px]"} />
              ) : (
                <Trophy size={54} className="text-[#8a5a08]" aria-hidden="true" />
              )}
            </div>
            <div className={layout === "dialog" ? "flex min-w-0 flex-1 flex-col justify-center px-3 py-4 sm:px-5" : "flex min-w-0 flex-1 flex-col justify-center px-2 py-2 sm:px-4"}>
              <h4 className="text-base font-extrabold leading-snug text-ink">{award.title}</h4>
              <p className="mt-2 break-words text-sm font-semibold text-[#526487]">
                {playerLabel === "mention" && player.startsWith("@") ? (
                  <a className="text-journey underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25" href={`https://t.me/${player.slice(1)}`}>{player}</a>
                ) : player}
              </p>
              <p className="mt-2 text-sm font-extrabold leading-snug text-[#78500d]">{award.result}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

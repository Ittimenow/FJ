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
    <ol className={layout === "dialog" ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
      {awards.map((award) => {
        const image = awardImagePath(award.kind);
        const player = playerLabel === "mention" ? award.mention : award.playerName;
        return (
          <li key={award.kind} className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_12px_32px_rgba(27,57,118,.10)]">
            <div className="flex h-36 items-center justify-center bg-[#fff0cf] px-4 pt-3 sm:h-40">
              {image ? (
                <Image src={image} width={512} height={512} alt="" className="h-full w-full object-contain drop-shadow-[0_9px_8px_rgba(91,59,23,.17)]" />
              ) : (
                <Trophy size={54} className="text-[#8a5a08]" aria-hidden="true" />
              )}
            </div>
            <div className="p-4 sm:p-5">
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

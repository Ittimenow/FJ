import { Banknote, ClipboardCheck, Dices, FileText, HandCoins, Handshake, Landmark, Layers3, Receipt, ShoppingCart, X } from "lucide-react";
import type { GameEvent } from "@/lib/types";
import { actionIconKind } from "./game-action-icon.logic";

const icons = {cash:Banknote,dice:Dices,opportunity:Layers3,purchase:ShoppingCart,sale:HandCoins,bank:Landmark,expense:Receipt,decline:X,offer:Handshake,decision:ClipboardCheck,event:FileText};

export function GameActionIcon({event}: {event?:GameEvent | undefined}) {
  const kind = actionIconKind(event), Icon = icons[kind];
  return <span className="game-turn-marker" data-action-icon={kind} aria-hidden="true"><Icon size={16} strokeWidth={1.5}/></span>;
}

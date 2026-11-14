import assert from "node:assert/strict";
import test from "node:test";
import type { GameEvent } from "../../lib/types";
import { actionIconKind } from "./game-action-icon.logic";

const event=(type:string,payload:Record<string,unknown>={}):GameEvent=>({id:"e",sequence:1,createdAt:"",type,payload});

test("101 and 202 assign matching icons to the same actions",()=>{
  for(const [classic,payload,icon] of [
    ["paycheck:receive",{effectType:"paycheck"},"cash"],
    ["player:move",{effectType:"dice"},"dice"],
    ["card:draw",{effectType:"card_opened"},"opportunity"],
    ["deal:buy",{commandType:"decide",choice:"buy"},"purchase"],
    ["deal:sell",{commandType:"decide",choice:"sell"},"sale"],
    ["loan:repay",{commandType:"repay"},"bank"],
    ["doodad:paid",{effectType:"expense"},"expense"],
    ["deal:decline",{commandType:"decide",choice:"pass",taskKind:"sale"},"decline"]
  ] as const){
    assert.equal(actionIconKind(event(classic)),icon);
    assert.equal(actionIconKind(event("game202:action",payload)),icon);
  }
  assert.equal(actionIconKind(),"decision");
  assert.equal(actionIconKind(event("future:event")),"event");
});

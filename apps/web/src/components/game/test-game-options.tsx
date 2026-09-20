"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function TestGameOptions() {
  const [enabled, setEnabled] = useState(false);
  return <fieldset className="rounded-xl bg-card p-4 text-sm text-ink">
    <legend className="px-1 font-extrabold">Тестирование игры</legend>
    <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
      <input type="checkbox" name="testing" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 accent-[#2967df]" />
      Начать сразу на большом круге
    </label>
    <p className="mt-1 leading-6">Тестовая партия доступна администратору. Её результаты не попадут в статистику и публикации.</p>
    {enabled ? <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="grid gap-2 font-bold">Наличные каждого игрока, $<Input name="testCashCents" type="number" min={0} max={10_000_000} step={1} defaultValue={500_000} required /></label>
      <label className="grid gap-2 font-bold">Начальный доход CASHFLOW, $<Input name="testIncomeCents" type="number" min={1} max={1_000_000} step={1} defaultValue={100_000} required /></label>
    </div> : null}
  </fieldset>;
}

export function testOptionsFromForm(form: FormData) {
  return form.get("testing") === "on" ? { testing: true, testCashCents: Number(form.get("testCashCents")), testIncomeCents: Number(form.get("testIncomeCents")) } : {};
}

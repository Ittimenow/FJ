import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeDisplayName,
  normalizeEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateResetToken,
  validateAccountType
} from "./auth-validation";

test("нормализует email и имя перед отправкой", () => {
  assert.equal(normalizeEmail("  PLAYER@Example.COM "), "player@example.com");
  assert.equal(normalizeDisplayName("  Анна   Смирнова  "), "Анна Смирнова");
});

test("принимает только публичные типы аккаунта", () => {
  assert.equal(validateAccountType("PLAYER"), true);
  assert.equal(validateAccountType("HOST"), true);
  assert.equal(validateAccountType("ADMIN"), false);
  assert.equal(validateAccountType(""), false);
});

test("возвращает русские ошибки для некорректных данных", () => {
  assert.equal(validateEmail("wrong"), "Введите адрес в формате name@example.com.");
  assert.equal(validateDisplayName(" "), "Введите имя игрока.");
  assert.equal(validatePassword("1234567"), "Пароль должен содержать не менее 8 символов.");
  assert.equal(validatePassword("x".repeat(129)), "Пароль должен содержать не более 128 символов.");
  assert.equal(validateResetToken("wrong"), "Ссылка восстановления недействительна. Запросите новую ссылку.");
});

test("принимает корректные данные на границах", () => {
  assert.equal(validateDisplayName("Ян"), null);
  assert.equal(validateEmail("player@example.com"), null);
  assert.equal(validatePassword("12345678"), null);
  assert.equal(validatePassword("x".repeat(128)), null);
  assert.equal(validateResetToken("a".repeat(64)), null);
});

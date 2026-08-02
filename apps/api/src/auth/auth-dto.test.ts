import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RegisterDto } from "./dto/register.dto";
import { registrationSystemRole } from "./auth.service";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { PERSONAL_DATA_CONSENT_VERSION } from "@cashflow/shared";
import { SystemRole } from "@prisma/client";

test("DTO регистрации нормализует данные", async () => {
  const dto = plainToInstance(RegisterDto, {
    email: "  PLAYER@Example.COM ",
    password: "12345678",
    displayName: "  Анна   Смирнова  ",
    accountType: "PLAYER",
    personalDataConsent: true,
    consentVersion: PERSONAL_DATA_CONSENT_VERSION
  });
  assert.deepEqual(await validate(dto), []);
  assert.equal(dto.email, "player@example.com");
  assert.equal(dto.displayName, "Анна Смирнова");
});

test("DTO регистрации возвращает русские сообщения", async () => {
  const dto = plainToInstance(RegisterDto, {
    email: "wrong",
    password: "123",
    displayName: " ",
    accountType: "ADMIN",
    personalDataConsent: false,
    consentVersion: PERSONAL_DATA_CONSENT_VERSION
  });
  const messages = (await validate(dto)).flatMap((error) => Object.values(error.constraints ?? {}));
  assert.ok(messages.includes("Введите корректный адрес электронной почты."));
  assert.ok(messages.includes("Пароль должен содержать не менее 8 символов."));
  assert.ok(messages.includes("Имя должно содержать не менее 2 символов."));
  assert.ok(messages.includes("Выберите тип аккаунта: игрок или ведущий."));
  assert.ok(messages.includes("Подтвердите согласие на обработку персональных данных."));
});

test("DTO регистрации принимает аккаунт ведущего", async () => {
  const dto = plainToInstance(RegisterDto, {
    email: "host@example.com",
    password: "12345678",
    displayName: "Анна",
    accountType: "HOST",
    personalDataConsent: true,
    consentVersion: PERSONAL_DATA_CONSENT_VERSION
  });
  assert.deepEqual(await validate(dto), []);
});

test("выбор типа аккаунта преобразуется в безопасную системную роль", () => {
  assert.equal(registrationSystemRole("PLAYER", false), SystemRole.USER);
  assert.equal(registrationSystemRole("HOST", false), SystemRole.HOST);
  assert.equal(registrationSystemRole("HOST", true), SystemRole.ADMIN);
});

test("DTO сброса пароля проверяет формат токена и длину пароля", async () => {
  const dto = plainToInstance(ResetPasswordDto, { token: "wrong", password: "x".repeat(129) });
  const messages = (await validate(dto)).flatMap((error) => Object.values(error.constraints ?? {}));
  assert.ok(messages.includes("Код восстановления имеет неверный формат."));
  assert.ok(messages.includes("Пароль должен содержать не более 128 символов."));
});

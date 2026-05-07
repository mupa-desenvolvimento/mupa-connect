import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { normalizeErrorDetail, normalizePhone } from "./index.ts";

Deno.test("normalizes Evolution object error into a readable message", () => {
  const message = normalizeErrorDetail([{ jid: "+51995643344@s.whatsapp.net", exists: false }]);
  assertEquals(message, "Número não encontrado no WhatsApp: +51995643344@s.whatsapp.net");
});

Deno.test("normalizes nested Evolution validation arrays", () => {
  const message = normalizeErrorDetail([["instance requires property \"textMessage\""]]);
  assertEquals(message, "instance requires property \"textMessage\"");
});

Deno.test("normalizes phone numbers before sending", () => {
  assertEquals(normalizePhone("+55 (11) 99999-9999"), "5511999999999");
});

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import "./index.ts";

const endpoint = "http://127.0.0.1:9999";

Deno.test("rejects invalid phone with clear 400 response", async () => {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid-test-token",
    },
    body: JSON.stringify({
      action: "sendMessage",
      instanceName: "suporte",
      phone: "abc",
      message: "Teste",
    }),
  });

  const body = await res.text();
  assertEquals(res.status, 401);
  assertStringIncludes(body, "Unauthorized");
});

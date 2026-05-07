import { describe, expect, it } from "vitest";
import { isAtLeast, type Role } from "@/lib/roles";

describe("isAtLeast", () => {
  it.each<[Role, Role, boolean]>([
    ["owner", "owner", true],
    ["owner", "admin", true],
    ["owner", "member", true],
    ["admin", "owner", false],
    ["admin", "admin", true],
    ["admin", "member", true],
    ["member", "owner", false],
    ["member", "admin", false],
    ["member", "member", true],
  ])("%s >= %s -> %s", (role, minimum, expected) => {
    expect(isAtLeast(role, minimum)).toBe(expected);
  });
});

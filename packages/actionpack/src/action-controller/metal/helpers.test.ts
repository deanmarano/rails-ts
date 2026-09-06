import { afterEach, describe, expect, it } from "vitest";

import type { HelperMethodsModule } from "../../abstract-controller/helpers.js";
import { modulesForHelpers, setApplicationHelpers, setHelpersPath } from "./helpers.js";

const AbcHelper: HelperMethodsModule = { bareA: () => "a" };
const FooHelper: HelperMethodsModule = { foo: () => "FOO" };

const constants = new Map<string, HelperMethodsModule>([
  ["AbcHelper", AbcHelper],
  ["FooHelper", FooHelper],
]);

afterEach(() => {
  setHelpersPath([]);
  setApplicationHelpers([], new Map());
});

describe("ActionController::Helpers.modulesForHelpers", () => {
  it("expands :all to every application helper", () => {
    setApplicationHelpers(["abc"], constants);

    expect(modulesForHelpers(["all"])).toEqual([AbcHelper]);
  });

  it("expands the Symbol spelling of :all too", () => {
    setApplicationHelpers(["abc"], constants);

    expect(modulesForHelpers([Symbol("all")])).toEqual([AbcHelper]);
  });

  it("appends the application helpers after the arguments that stay", () => {
    setApplicationHelpers(["abc"], constants);

    expect(modulesForHelpers(["foo", "all"])).toEqual([FooHelper, AbcHelper]);
  });

  it("resolves a helper by name when :all is absent", () => {
    setApplicationHelpers(["abc"], constants);

    expect(modulesForHelpers(["foo"])).toEqual([FooHelper]);
  });
});

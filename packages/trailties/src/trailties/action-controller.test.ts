import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runTrailtieInitializers } from "../support/trailtie-initializers.js";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { Trailtie, type ActionControllerConfig } from "./action-controller.js";
import { Deprecators, resetLoadHooks, runLoadHooks } from "@blazetrails/activesupport";
import { Trailtie as BaseTrailtie } from "../trailtie.js";
import { AbstractController, ActionController, RouteSet } from "@blazetrails/actionpack";

let deprecators: Deprecators;
let app: {
  deprecators: Deprecators;
  routes(): RouteSet;
  config: { helpersPaths: string[] };
};

describe("ActionController::Trailtie", () => {
  let savedConfig: ActionControllerConfig;

  beforeEach(() => {
    deprecators = new Deprecators();
    const routes = new RouteSet();
    app = { deprecators, routes: () => routes, config: { helpersPaths: [] } };
    savedConfig = structuredClone(
      Trailtie.config.get("actionController") as ActionControllerConfig,
    );
  });

  afterEach(() => {
    Trailtie.config.set("actionController", savedConfig);
  });

  it("ActionController::Railtie is registered in the global subclasses list", () => {
    expect(BaseTrailtie.subclasses()).toContain(Trailtie);
  });

  it("runInitializers registers the ActionController deprecator", async () => {
    await runTrailtieInitializers(Trailtie, app);
    expect(deprecators.get("actionController")).toBe(ActionController.deprecator());
  });

  it("seeds config.actionController with the Rails default OrderedOptions block", () => {
    const cfg = Trailtie.config.get("actionController") as ActionControllerConfig;
    expect(cfg.raiseOnOpenRedirects).toBe(false);
    expect(cfg.logQueryTagsAroundActions).toBe(true);
    expect(cfg.wrapParametersByDefault).toBe(false);
    expect(cfg.includeAllHelpers).toBe(true);
  });
});

describe("action_controller.include_all_helpers", () => {
  let root: string;
  let savedConfig: ActionControllerConfig;

  beforeEach(() => {
    resetLoadHooks();
    deprecators = new Deprecators();
    const routes = new RouteSet();
    root = mkdtempSync(join(tmpdir(), "include-all-helpers-"));
    mkdirSync(join(root, "nested"), { recursive: true });
    writeFileSync(
      join(root, "application-helper.ts"),
      "export const ApplicationHelper = { statusBadge: (s) => `badge:${s}` };",
    );
    writeFileSync(
      join(root, "nested", "admin-helper.ts"),
      "export const AdminHelper = { adminBadge: () => 'admin' };",
    );
    app = { deprecators, routes: () => routes, config: { helpersPaths: [root] } };
    savedConfig = structuredClone(
      Trailtie.config.get("actionController") as ActionControllerConfig,
    );
  });

  afterEach(() => {
    Trailtie.config.set("actionController", savedConfig);
    rmSync(root, { recursive: true, force: true });
  });

  function receivingController(): AbstractController.HelpersClassMethods {
    class HelpersReceiver extends ActionController.Base {}
    return HelpersReceiver as unknown as AbstractController.HelpersClassMethods;
  }

  it("includes every module under config.helpersPaths", async () => {
    const base = receivingController();
    await runTrailtieInitializers(Trailtie, app);
    runLoadHooks("action_controller", base);

    expect(base._helpers!.statusBadge.call({}, "ready")).toBe("badge:ready");
  });

  it("includes helpers from a nested directory", async () => {
    const base = receivingController();
    await runTrailtieInitializers(Trailtie, app);
    runLoadHooks("action_controller", base);

    expect(base._helpers!.adminBadge.call({})).toBe("admin");
  });

  it("includes nothing when config.actionController.includeAllHelpers is false", async () => {
    const cfg = Trailtie.config.get("actionController") as ActionControllerConfig;
    Trailtie.config.set("actionController", { ...cfg, includeAllHelpers: false });
    const base = receivingController();

    await runTrailtieInitializers(Trailtie, app);
    runLoadHooks("action_controller", base);

    expect(base._helpers?.statusBadge).toBeUndefined();
  });

  it("includes nothing when the app has no app/helpers directory", async () => {
    app.config.helpersPaths = [];
    const base = receivingController();

    await runTrailtieInitializers(Trailtie, app);
    runLoadHooks("action_controller", base);

    expect(base._helpers?.statusBadge).toBeUndefined();
  });
});

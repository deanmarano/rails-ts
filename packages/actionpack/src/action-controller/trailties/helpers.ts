import { helper, type HelpersClassMethods } from "../../abstract-controller/helpers.js";
import { helpersPath, modulesForHelpers } from "../metal/helpers.js";

export interface HelpersPathControllerClass extends HelpersClassMethods {
  helpersPath?: string[];
  includeAllHelpers?: boolean;
}

export function inherited(
  klass: HelpersPathControllerClass,
  base: HelpersPathControllerClass,
): void {
  if (!("helpersPath" in klass)) return;

  klass.helpersPath = helpersPath();

  if (Object.getPrototypeOf(klass) === base && base.includeAllHelpers) {
    helper(klass, ...modulesForHelpers(["all"]));
  }
}

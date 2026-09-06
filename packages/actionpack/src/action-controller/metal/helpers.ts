import {
  allHelpersFromPath,
  modulesForHelpers as abstractModulesForHelpers,
  type HelperMethodsModule,
  type HelperResolver,
  type ResolutionOptions,
} from "../../abstract-controller/helpers.js";

let _helpersPath: string[] = [];

export function helpersPath(): string[] {
  return _helpersPath;
}

export function setHelpersPath(paths: string[]): void {
  _helpersPath = paths;
}

let _applicationHelpers: string[] = [];
let _applicationHelperConstants = new Map<string, HelperMethodsModule>();

/** @noRailsEquivalent PERMANENT */
export function setApplicationHelpers(
  names: string[],
  constants: Map<string, HelperMethodsModule>,
): void {
  _applicationHelpers = names;
  _applicationHelperConstants = constants;
}

/** @noRailsEquivalent PERMANENT */
export function applicationHelperResolver(): HelperResolver {
  return (name) => _applicationHelperConstants.get(name);
}

/** @noRailsEquivalent PERMANENT */
export async function loadApplicationHelperNames(): Promise<string[]> {
  _applicationHelpers = await allHelpersFromPath(_helpersPath);
  return _applicationHelpers;
}

/** @internal */
function allApplicationHelpers(): string[] {
  return _applicationHelpers;
}

export function modulesForHelpers(
  args: ReadonlyArray<HelperMethodsModule | string | symbol | Array<unknown>>,
  options: ResolutionOptions = { resolve: applicationHelperResolver() },
): HelperMethodsModule[] {
  const rest = (args as readonly unknown[]).filter((arg) => arg !== "all");
  const argsWithAll = rest.length === args.length ? rest : [...rest, ...allApplicationHelpers()];
  return abstractModulesForHelpers(
    argsWithAll as ReadonlyArray<HelperMethodsModule | string | symbol | Array<unknown>>,
    options,
  );
}

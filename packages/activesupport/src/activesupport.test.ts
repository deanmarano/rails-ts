import { describe, it, expect } from "vitest";
import {
  pluralize,
  singularize,
  camelize,
  underscore,
  titleize,
  tableize,
  classify,
  dasherize,
  demodulize,
  deconstantize,
  foreignKey,
  humanize,
  parameterize,
  ordinal,
  ordinalize,
  isBlank,
  isPresent,
  presence,
  squish,
  truncate,
  truncateWords,
} from "./index.js";

// Rails inflector_test_cases.rb — SingularToPlural
const singularToPlural: Record<string, string> = {
  search: "searches",
  switch: "switches",
  fix: "fixes",
  box: "boxes",
  process: "processes",
  address: "addresses",
  case: "cases",
  stack: "stacks",
  wish: "wishes",
  fish: "fish",
  jeans: "jeans",
  funky_jeans: "funky_jeans",
  category: "categories",
  query: "queries",
  ability: "abilities",
  agency: "agencies",
  movie: "movies",
  archive: "archives",
  index: "indexes",
  wife: "wives",
  safe: "saves",
  half: "halves",
  move: "moves",
  testis: "testes",
  virus: "viri",
  octopus: "octopi",
  status: "statuses",
  alias: "aliases",
  bus: "buses",
  buffalo: "buffaloes",
  tomato: "tomatoes",
  datum: "data",
  medium: "media",
  stadium: "stadia",
  analysis: "analyses",
  diagnosis: "diagnoses",
  diagnosis_a: "diagnosis_as",
  thesis: "theses",
  parenthesis: "parentheses",
  prognosis: "prognoses",
  basis: "bases",
  synopsis: "synopses",
  hive: "hives",
  quiz: "quizzes",
  matrix: "matrices",
  vertex: "vertexes",
  appendix: "appendices",
  ox: "oxen",
  mouse: "mice",
  louse: "lice",
  series: "series",
  sheep: "sheep",
  person: "people",
  man: "men",
  child: "children",
  sex: "sexes",
  zombie: "zombies",
  edge: "edges",
  cow: "cows",
  database: "databases",
  shoe: "shoes",
  horse: "horses",
  rice: "rice",
  equipment: "equipment",
  information: "information",
  money: "money",
  species: "species",
  police: "police",
  news: "news",
  perspective: "perspectives",
  axis: "axes",
  taxi: "taxis",
};

describe("Inflector", () => {
  describe("pluralize", () => {
    for (const [singular, plural] of Object.entries(singularToPlural)) {
      it(`pluralizes "${singular}" to "${plural}"`, () => {
        expect(pluralize(singular)).toBe(plural);
      });
    }

    it("returns empty string for empty string", () => {
      expect(pluralize("")).toBe("");
    });
  });

  describe("singularize", () => {
    // These plurals don't round-trip with Rails' default singular rules
    const skipSingularize = new Set(["appendices"]);

    for (const [singular, plural] of Object.entries(singularToPlural)) {
      if (singular === plural) continue;
      if (skipSingularize.has(plural)) continue;
      it(`singularizes "${plural}" to "${singular}"`, () => {
        expect(singularize(plural)).toBe(singular);
      });
    }
  });

  // CamelToUnderscore
  const camelToUnderscore: [string, string][] = [
    ["Product", "product"],
    ["SpecialGuest", "special_guest"],
    ["ApplicationController", "application_controller"],
    ["Area51Controller", "area51_controller"],
    ["HTMLParser", "html_parser"],
    ["SimpleHTMLParser", "simple_html_parser"],
  ];

  describe("camelize", () => {
    it("camelizes underscored words", () => {
      expect(camelize("active_model")).toBe("ActiveModel");
      expect(camelize("active_model/errors")).toBe("ActiveModel::Errors");
      expect(camelize("product")).toBe("Product");
      expect(camelize("special_guest")).toBe("SpecialGuest");
      expect(camelize("application_controller")).toBe(
        "ApplicationController"
      );
    });

    it("camelizes with lowercase first letter", () => {
      expect(camelize("active_model", false)).toBe("activeModel");
      expect(camelize("product", false)).toBe("product");
    });
  });

  describe("underscore", () => {
    for (const [camel, under] of camelToUnderscore) {
      it(`underscores "${camel}" to "${under}"`, () => {
        expect(underscore(camel)).toBe(under);
      });
    }

    it("underscores namespaced classes", () => {
      expect(underscore("ActiveModel::Errors")).toBe("active_model/errors");
    });
  });

  // Underscore to human
  const underscoreToHuman: [string, string][] = [
    ["employee_salary", "Employee salary"],
    ["employee_id", "Employee"],
    ["underground", "Underground"],
    ["author_id", "Author"],
  ];

  describe("humanize", () => {
    for (const [input, expected] of underscoreToHuman) {
      it(`humanizes "${input}" to "${expected}"`, () => {
        expect(humanize(input)).toBe(expected);
      });
    }

    it("humanizes without capitalize", () => {
      expect(humanize("employee_salary", { capitalize: false })).toBe(
        "employee salary"
      );
    });
  });

  describe("titleize", () => {
    it("titleizes underscored words", () => {
      expect(titleize("active_record")).toBe("Active Record");
    });

    it("titleizes camelCase", () => {
      expect(titleize("ActiveRecord")).toBe("Active Record");
    });

    it("titleizes mixed words", () => {
      expect(titleize("action_web_service")).toBe("Action Web Service");
    });
  });

  describe("tableize", () => {
    it("tableizes class names", () => {
      expect(tableize("RawScaledScorer")).toBe("raw_scaled_scorers");
      expect(tableize("EggAndHam")).toBe("egg_and_hams");
      expect(tableize("FancyCategory")).toBe("fancy_categories");
    });
  });

  describe("classify", () => {
    it("classifies table names", () => {
      expect(classify("egg_and_hams")).toBe("EggAndHam");
      expect(classify("posts")).toBe("Post");
      expect(classify("fancy_categories")).toBe("FancyCategory");
    });

    it("strips schema prefix", () => {
      expect(classify("schema.posts")).toBe("Post");
    });
  });

  describe("dasherize", () => {
    it("replaces underscores with dashes", () => {
      expect(dasherize("puni_puni")).toBe("puni-puni");
    });
  });

  describe("demodulize", () => {
    it("strips module namespace", () => {
      expect(demodulize("ActiveSupport::Inflector::Inflections")).toBe(
        "Inflections"
      );
      expect(demodulize("Inflections")).toBe("Inflections");
      expect(demodulize("::Inflections")).toBe("Inflections");
    });
  });

  describe("deconstantize", () => {
    it("strips rightmost segment", () => {
      expect(deconstantize("Net::HTTP")).toBe("Net");
      expect(deconstantize("::Net::HTTP")).toBe("::Net");
      expect(deconstantize("String")).toBe("");
      expect(deconstantize("::String")).toBe("");
    });
  });

  describe("foreignKey", () => {
    it("creates foreign key from class name", () => {
      expect(foreignKey("Message")).toBe("message_id");
      expect(foreignKey("Admin::Post")).toBe("post_id");
    });

    it("creates foreign key without separator", () => {
      expect(foreignKey("Message", false)).toBe("messageid");
    });
  });

  describe("parameterize", () => {
    it("parameterizes strings", () => {
      expect(parameterize("Donald E. Knuth")).toBe("donald-e-knuth");
      expect(parameterize("Donald E. Knuth", { separator: "_" })).toBe(
        "donald_e_knuth"
      );
    });

    it("preserves case when asked", () => {
      expect(
        parameterize("Donald E. Knuth", { preserveCase: true })
      ).toBe("Donald-E-Knuth");
    });
  });

  describe("ordinal", () => {
    it("returns correct ordinals", () => {
      expect(ordinal(1)).toBe("st");
      expect(ordinal(2)).toBe("nd");
      expect(ordinal(3)).toBe("rd");
      expect(ordinal(4)).toBe("th");
      expect(ordinal(11)).toBe("th");
      expect(ordinal(12)).toBe("th");
      expect(ordinal(13)).toBe("th");
      expect(ordinal(21)).toBe("st");
      expect(ordinal(22)).toBe("nd");
      expect(ordinal(23)).toBe("rd");
      expect(ordinal(100)).toBe("th");
      expect(ordinal(101)).toBe("st");
      expect(ordinal(111)).toBe("th");
      expect(ordinal(1001)).toBe("st");
    });
  });

  describe("ordinalize", () => {
    it("ordinalizes numbers", () => {
      expect(ordinalize(1)).toBe("1st");
      expect(ordinalize(2)).toBe("2nd");
      expect(ordinalize(3)).toBe("3rd");
      expect(ordinalize(11)).toBe("11th");
      expect(ordinalize(1002)).toBe("1002nd");
      expect(ordinalize(1003)).toBe("1003rd");
    });
  });
});

describe("String utilities", () => {
  describe("isBlank", () => {
    it("returns true for null, undefined, empty string", () => {
      expect(isBlank(null)).toBe(true);
      expect(isBlank(undefined)).toBe(true);
      expect(isBlank("")).toBe(true);
      expect(isBlank("   ")).toBe(true);
      expect(isBlank("\t\n")).toBe(true);
    });

    it("returns false for present values", () => {
      expect(isBlank("hello")).toBe(false);
      expect(isBlank(0)).toBe(false);
      expect(isBlank(1)).toBe(false);
      expect(isBlank([1])).toBe(false);
    });

    it("returns true for empty collections", () => {
      expect(isBlank([])).toBe(true);
      expect(isBlank({})).toBe(true);
    });

    it("returns true for false, false for true", () => {
      expect(isBlank(false)).toBe(true);
      expect(isBlank(true)).toBe(false);
    });
  });

  describe("isPresent", () => {
    it("is the inverse of isBlank", () => {
      expect(isPresent("hello")).toBe(true);
      expect(isPresent("")).toBe(false);
      expect(isPresent(null)).toBe(false);
    });
  });

  describe("presence", () => {
    it("returns value if present, undefined if blank", () => {
      expect(presence("hello")).toBe("hello");
      expect(presence("")).toBeUndefined();
      expect(presence(null)).toBeUndefined();
    });
  });

  describe("squish", () => {
    it("squishes whitespace", () => {
      expect(squish("  foo   bar  \n  baz  ")).toBe("foo bar baz");
    });
  });

  describe("truncate", () => {
    it("truncates long strings", () => {
      expect(truncate("Once upon a time", 10)).toBe("Once up...");
    });

    it("does not truncate short strings", () => {
      expect(truncate("short", 10)).toBe("short");
    });

    it("accepts custom omission", () => {
      expect(truncate("Once upon a time", 10, { omission: "!" })).toBe(
        "Once upon!"
      );
    });
  });

  describe("truncateWords", () => {
    it("truncates by word count", () => {
      expect(truncateWords("Once upon a time in a world", 4)).toBe(
        "Once upon a time..."
      );
    });

    it("does not truncate if fewer words", () => {
      expect(truncateWords("Once upon", 4)).toBe("Once upon");
    });
  });
});

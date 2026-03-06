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
  stripHeredoc,
  downcaseFirst,
  upcaseFirst,
  at,
  first,
  last,
  from,
  to,
  indent,
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

  // === Tests matching Rails inflector_test.rb ===

  describe("pluralize plurals", () => {
    it("pluralize plurals", () => {
      // test_pluralize_plurals
      expect(pluralize("plurals")).toBe("plurals");
    });
  });

  describe("pluralize empty string", () => {
    it("pluralize empty string", () => {
      // test_pluralize_empty_string
      expect(pluralize("")).toBe("");
    });
  });

  describe("uncountable word is not greedy", () => {
    it("uncountable word is not greedy", () => {
      // test_uncountable_word_is_not_greedy
      expect(singularize("sponsor")).toBe("sponsor");
      expect(pluralize("sponsor")).toBe("sponsors");
    });
  });

  describe("pluralize singular", () => {
    const cases: [string, string][] = [
      ["salesperson", "salespeople"],
      ["spokesman", "spokesmen"],
      ["woman", "women"],
      ["my_analysis", "my_analyses"],
      ["node_child", "node_children"],
      ["comment", "comments"],
      ["foobar", "foobars"],
      ["newsletter", "newsletters"],
      ["old_news", "old_news"],
      ["miniseries", "miniseries"],
      ["portfolio", "portfolios"],
      ["experience", "experiences"],
      ["day", "days"],
      ["dwarf", "dwarves"],
      ["elf", "elves"],
      ["status_code", "status_codes"],
      ["photo", "photos"],
    ];
    for (const [singular, plural] of cases) {
      it(`pluralize singular ${singular}`, () => {
        expect(pluralize(singular)).toBe(plural);
      });
    }
  });

  describe("singularize plural", () => {
    const cases: [string, string][] = [
      ["searches", "search"],
      ["switches", "switch"],
      ["fixes", "fix"],
      ["boxes", "box"],
      ["processes", "process"],
      ["addresses", "address"],
      ["cases", "case"],
      ["stacks", "stack"],
      ["wishes", "wish"],
      ["categories", "category"],
      ["queries", "query"],
      ["abilities", "ability"],
      ["agencies", "agency"],
      ["movies", "movie"],
      ["archives", "archive"],
      ["halves", "half"],
      ["data", "datum"],
      ["media", "medium"],
      ["stadia", "stadium"],
      ["analyses", "analysis"],
      ["children", "child"],
      ["node_children", "node_child"],
      ["quizzes", "quiz"],
      ["perspectives", "perspective"],
      ["oxen", "ox"],
      ["photos", "photo"],
      ["buffaloes", "buffalo"],
      ["tomatoes", "tomato"],
      ["dwarves", "dwarf"],
      ["elves", "elf"],
      ["buses", "bus"],
      ["statuses", "status"],
      ["status_codes", "status_code"],
      ["mice", "mouse"],
      ["lice", "louse"],
      ["houses", "house"],
      ["octopi", "octopus"],
      ["viri", "virus"],
      ["aliases", "alias"],
      ["portfolios", "portfolio"],
      ["vertices", "vertex"],
      ["matrices", "matrix"],
      ["crises", "crisis"],
      ["shoes", "shoe"],
      ["horses", "horse"],
      ["prizes", "prize"],
      ["edges", "edge"],
      ["databases", "database"],
      ["slices", "slice"],
    ];
    for (const [plural, singular] of cases) {
      it(`singularize plural ${plural}`, () => {
        expect(singularize(plural)).toBe(singular);
      });
    }
  });

  describe("camelize", () => {
    it("camelize", () => {
      // test_camelize — CamelToUnderscore
      expect(camelize("product")).toBe("Product");
      expect(camelize("special_guest")).toBe("SpecialGuest");
      expect(camelize("application_controller")).toBe("ApplicationController");
      expect(camelize("area51_controller")).toBe("Area51Controller");
    });

    it("camelize with true upcases the first letter", () => {
      // test_camelize_with_true_upcases_the_first_letter
      expect(camelize("capital", true)).toBe("Capital");
    });

    it("camelize with false downcases the first letter", () => {
      // test_camelize_with_false_downcases_the_first_letter
      expect(camelize("Capital", false)).toBe("capital");
      expect(camelize("capital", false)).toBe("capital");
    });

    it("camelize with underscores", () => {
      // test_camelize_with_underscores
      expect(camelize("Camel_Case")).toBe("CamelCase");
    });

    it("camelize with module", () => {
      // test_camelize_with_module
      expect(camelize("admin/product")).toBe("Admin::Product");
      expect(camelize("users/commission/department")).toBe("Users::Commission::Department");
    });

    it("underscore to lower camel", () => {
      // test_underscore_to_lower_camel
      expect(camelize("product", false)).toBe("product");
      expect(camelize("special_guest", false)).toBe("specialGuest");
      expect(camelize("application_controller", false)).toBe("applicationController");
      expect(camelize("area51_controller", false)).toBe("area51Controller");
    });
  });

  describe("underscore", () => {
    it("underscore", () => {
      // test_underscore — CamelToUnderscoreWithoutReverse
      expect(underscore("HTMLTidy")).toBe("html_tidy");
      expect(underscore("HTMLTidyGenerator")).toBe("html_tidy_generator");
      expect(underscore("FreeBSD")).toBe("free_bsd");
      expect(underscore("HTML")).toBe("html");
      expect(underscore("ForceXMLController")).toBe("force_xml_controller");
    });

    it("underscore with slashes", () => {
      // test_underscore_with_slashes
      expect(underscore("Admin::Product")).toBe("admin/product");
      expect(underscore("Users::Commission::Department")).toBe("users/commission/department");
      expect(underscore("UsersSection::CommissionDepartment")).toBe("users_section/commission_department");
    });

    it("underscore as reverse of dasherize", () => {
      // test_underscore_as_reverse_of_dasherize
      expect(underscore(dasherize("street"))).toBe("street");
      expect(underscore(dasherize("street_address"))).toBe("street_address");
      expect(underscore(dasherize("person_street_address"))).toBe("person_street_address");
    });
  });

  describe("demodulize", () => {
    it("demodulize", () => {
      // test_demodulize
      expect(demodulize("MyApplication::Billing::Account")).toBe("Account");
      expect(demodulize("Account")).toBe("Account");
      expect(demodulize("::Account")).toBe("Account");
      expect(demodulize("")).toBe("");
    });
  });

  describe("deconstantize", () => {
    it("deconstantize", () => {
      // test_deconstantize
      expect(deconstantize("MyApplication::Billing::Account")).toBe("MyApplication::Billing");
      expect(deconstantize("::MyApplication::Billing::Account")).toBe("::MyApplication::Billing");
      expect(deconstantize("MyApplication::Billing")).toBe("MyApplication");
      expect(deconstantize("::MyApplication::Billing")).toBe("::MyApplication");
      expect(deconstantize("Account")).toBe("");
      expect(deconstantize("::Account")).toBe("");
      expect(deconstantize("")).toBe("");
    });
  });

  describe("tableize", () => {
    it("tableize", () => {
      // test_tableize — ClassNameToTableName
      expect(tableize("PrimarySpokesman")).toBe("primary_spokesmen");
      expect(tableize("NodeChild")).toBe("node_children");
    });
  });

  describe("classify", () => {
    it("classify", () => {
      // test_classify — ClassNameToTableName
      expect(classify("primary_spokesmen")).toBe("PrimarySpokesman");
      expect(classify("node_children")).toBe("NodeChild");
    });

    it("classify with leading schema name", () => {
      // test_classify_with_leading_schema_name
      expect(classify("schema.foo_bar")).toBe("FooBar");
    });
  });

  describe("humanize", () => {
    it("humanize nil", () => {
      // test_humanize_nil — humanize(nil) returns ""
      expect(humanize("")).toBe("");
    });

    it("humanize without capitalize", () => {
      // test_humanize_without_capitalize
      expect(humanize("employee_salary", { capitalize: false })).toBe("employee salary");
      expect(humanize("employee_id", { capitalize: false })).toBe("employee");
      expect(humanize("underground", { capitalize: false })).toBe("underground");
    });
  });

  describe("dasherize", () => {
    it("dasherize", () => {
      // test_dasherize
      expect(dasherize("street")).toBe("street");
      expect(dasherize("street_address")).toBe("street-address");
      expect(dasherize("person_street_address")).toBe("person-street-address");
    });
  });

  describe("parameterize", () => {
    it("parameterize", () => {
      // test_parameterize — StringToParameterized
      expect(parameterize("Random text with *(bad)* characters")).toBe("random-text-with-bad-characters");
      expect(parameterize("Allow_Under_Scores")).toBe("allow_under_scores");
      expect(parameterize("Trailing bad characters!@#")).toBe("trailing-bad-characters");
      expect(parameterize("!@#Leading bad characters")).toBe("leading-bad-characters");
      expect(parameterize("Squeeze   separators")).toBe("squeeze-separators");
      expect(parameterize("Test with + sign")).toBe("test-with-sign");
    });

    it("parameterize with custom separator", () => {
      // test_parameterize_with_custom_separator — StringToParameterizeWithUnderscore
      expect(parameterize("Donald E. Knuth", { separator: "_" })).toBe("donald_e_knuth");
      expect(parameterize("Random text with *(bad)* characters", { separator: "_" })).toBe("random_text_with_bad_characters");
      expect(parameterize("Trailing bad characters!@#", { separator: "_" })).toBe("trailing_bad_characters");
      expect(parameterize("Squeeze   separators", { separator: "_" })).toBe("squeeze_separators");
    });
  });

  describe("ordinal", () => {
    it("ordinal", () => {
      // test_ordinal — OrdinalNumbers (suffix only)
      expect(ordinal(0)).toBe("th");
      expect(ordinal(5)).toBe("th");
      expect(ordinal(6)).toBe("th");
      expect(ordinal(7)).toBe("th");
      expect(ordinal(8)).toBe("th");
      expect(ordinal(9)).toBe("th");
      expect(ordinal(10)).toBe("th");
      expect(ordinal(14)).toBe("th");
      expect(ordinal(20)).toBe("th");
      expect(ordinal(24)).toBe("th");
      expect(ordinal(102)).toBe("nd");
      expect(ordinal(103)).toBe("rd");
      expect(ordinal(104)).toBe("th");
      expect(ordinal(110)).toBe("th");
      expect(ordinal(112)).toBe("th");
      expect(ordinal(113)).toBe("th");
      expect(ordinal(1000)).toBe("th");
    });
  });

  describe("ordinalize", () => {
    it("ordinalize", () => {
      // test_ordinalize — OrdinalNumbers
      expect(ordinalize(0)).toBe("0th");
      expect(ordinalize(4)).toBe("4th");
      expect(ordinalize(5)).toBe("5th");
      expect(ordinalize(10)).toBe("10th");
      expect(ordinalize(11)).toBe("11th");
      expect(ordinalize(12)).toBe("12th");
      expect(ordinalize(13)).toBe("13th");
      expect(ordinalize(14)).toBe("14th");
      expect(ordinalize(20)).toBe("20th");
      expect(ordinalize(21)).toBe("21st");
      expect(ordinalize(22)).toBe("22nd");
      expect(ordinalize(23)).toBe("23rd");
      expect(ordinalize(24)).toBe("24th");
      expect(ordinalize(100)).toBe("100th");
      expect(ordinalize(101)).toBe("101st");
      expect(ordinalize(102)).toBe("102nd");
      expect(ordinalize(103)).toBe("103rd");
      expect(ordinalize(104)).toBe("104th");
      expect(ordinalize(110)).toBe("110th");
      expect(ordinalize(111)).toBe("111th");
      expect(ordinalize(112)).toBe("112th");
      expect(ordinalize(113)).toBe("113th");
      expect(ordinalize(1000)).toBe("1000th");
      expect(ordinalize(1001)).toBe("1001st");
    });
  });

  describe("titleize", () => {
    it("titleize mixture to title case", () => {
      // test_titleize_mixture_to_title_case — MixtureToTitleCase
      expect(titleize("active_record")).toBe("Active Record");
      expect(titleize("ActiveRecord")).toBe("Active Record");
      expect(titleize("action web service")).toBe("Action Web Service");
      expect(titleize("Action Web Service")).toBe("Action Web Service");
      expect(titleize("actionwebservice")).toBe("Actionwebservice");
    });
  });

  describe("foreign key", () => {
    it("foreign key", () => {
      // test_foreign_key — ClassNameToForeignKeyWithUnderscore
      expect(foreignKey("Person")).toBe("person_id");
      expect(foreignKey("MyApplication::Billing::Account")).toBe("account_id");
    });

    it("foreign key without underscore", () => {
      // test_foreign_key — ClassNameToForeignKeyWithoutUnderscore
      expect(foreignKey("Person", false)).toBe("personid");
      expect(foreignKey("MyApplication::Billing::Account", false)).toBe("accountid");
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

  describe("String access", () => {
    describe("at", () => {
      it("at with positive Integer returns character at that position", () => {
        expect(at("hello", 0)).toBe("h");
        expect(at("hello", 4)).toBe("o");
      });

      it("at with negative Integer counts from the end", () => {
        expect(at("hello", -2)).toBe("l");
        expect(at("hello", -1)).toBe("o");
      });

      it("at returns undefined when out of range", () => {
        expect(at("hello", 10)).toBeUndefined();
        expect(at("hello", -10)).toBeUndefined();
      });
    });

    describe("from", () => {
      it("from with positive Integer returns substring from the given position to the end", () => {
        expect(from("hello", 2)).toBe("llo");
      });

      it("from with negative Integer position is counted from the end", () => {
        expect(from("hello", -2)).toBe("lo");
      });
    });

    describe("to", () => {
      it("to with positive Integer returns substring from the beginning to the given position", () => {
        expect(to("hello", 2)).toBe("hel");
      });

      it("to with negative Integer position is counted from the end", () => {
        expect(to("hello", -2)).toBe("hell");
        expect(to("hello", -5)).toBe("h");
        expect(to("hello", -7)).toBe("");
      });

      it("from and to can be combined", () => {
        expect(to(from("hello", 0), -1)).toBe("hello");
        expect(to(from("hello", 1), -2)).toBe("ell");
      });
    });

    describe("first", () => {
      it("first returns the first character", () => {
        expect(first("hello")).toBe("h");
        expect(first("x")).toBe("x");
      });

      it("first with Integer returns a substring from the beginning to position", () => {
        expect(first("hello", 2)).toBe("he");
        expect(first("hello", 0)).toBe("");
        expect(first("hello", 10)).toBe("hello");
        expect(first("x", 4)).toBe("x");
      });

      it("first with negative Integer raises ArgumentError", () => {
        expect(() => first("hello", -1)).toThrow();
      });
    });

    describe("last", () => {
      it("last returns the last character", () => {
        expect(last("hello")).toBe("o");
        expect(last("x")).toBe("x");
      });

      it("last with Integer returns a substring from the end to position", () => {
        expect(last("hello", 3)).toBe("llo");
        expect(last("hello", 10)).toBe("hello");
        expect(last("hello", 0)).toBe("");
        expect(last("x", 4)).toBe("x");
      });

      it("last with negative Integer raises ArgumentError", () => {
        expect(() => last("hello", -1)).toThrow();
      });
    });
  });

  describe("String transformations", () => {
    describe("strip_heredoc", () => {
      it("strip_heredoc on an empty string", () => {
        expect(stripHeredoc("")).toBe("");
      });

      it("strip_heredoc on a string with no lines", () => {
        expect(stripHeredoc("x")).toBe("x");
        expect(stripHeredoc("    x")).toBe("x");
      });

      it("strip_heredoc on a heredoc with no margin", () => {
        expect(stripHeredoc("foo\nbar")).toBe("foo\nbar");
        expect(stripHeredoc("foo\n  bar")).toBe("foo\n  bar");
      });

      it("strip_heredoc on a regular indented heredoc", () => {
        const input = "      foo\n        bar\n      baz\n";
        expect(stripHeredoc(input)).toBe("foo\n  bar\nbaz\n");
      });

      it("strip_heredoc on a regular indented heredoc with blank lines", () => {
        const input = "      foo\n        bar\n\n      baz\n";
        expect(stripHeredoc(input)).toBe("foo\n  bar\n\nbaz\n");
      });
    });

    describe("downcase_first", () => {
      it("downcase_first lowercases the first character", () => {
        expect(downcaseFirst("Try again")).toBe("try again");
      });

      it("downcase_first with one char", () => {
        expect(downcaseFirst("T")).toBe("t");
      });

      it("downcase_first with empty string", () => {
        expect(downcaseFirst("")).toBe("");
      });
    });

    describe("upcase_first", () => {
      it("upcase_first uppercases the first character", () => {
        expect(upcaseFirst("what a Lovely Day")).toBe("What a Lovely Day");
      });

      it("upcase_first with one char", () => {
        expect(upcaseFirst("w")).toBe("W");
      });

      it("upcase_first with empty string", () => {
        expect(upcaseFirst("")).toBe("");
      });
    });

    describe("indent", () => {
      it("does not indent strings that only contain newlines", () => {
        expect(indent("\n", 8)).toBe("\n");
        expect(indent("\n\n", 8)).toBe("\n\n");
      });

      it("by default indents with spaces if the existing indentation uses them", () => {
        expect(indent("foo\n  bar", 4)).toBe("    foo\n      bar");
      });

      it("by default indents with spaces as a fallback if there is no indentation", () => {
        expect(indent("foo\nbar\nbaz", 3)).toBe("   foo\n   bar\n   baz");
      });

      it("uses the indent char if passed", () => {
        expect(indent("foo\nbar", 4, ".")).toBe("....foo\n....bar");
      });

      it("does not indent blank lines by default", () => {
        expect(indent("foo\n\nbar", 1)).toBe(" foo\n\n bar");
      });

      it("indents blank lines if told so", () => {
        expect(indent("foo\n\nbar", 1, " ", true)).toBe(" foo\n \n bar");
      });
    });
  });
});

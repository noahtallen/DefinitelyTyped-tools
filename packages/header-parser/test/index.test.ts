import { TypeScriptVersion } from "@definitelytyped/typescript-versions";
import { parseHeaderOrFail, parseTypeScriptVersionLine, makeTypesVersionsForPackageJson } from "../src";

describe("parse", () => {
  it("works", () => {
    const src = dedent`
            // Type definitions for foo 1.2
            // Project: https://github.com/foo/foo, https://foo.com
            // Definitions by: My Self <https://github.com/me>, Some Other Guy <https://github.com/otherguy>
            // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
            // TypeScript Version: 2.2

            ...file content...`;
    expect(parseHeaderOrFail(src)).toStrictEqual({
      libraryName: "foo",
      libraryMajorVersion: 1,
      libraryMinorVersion: 2,
      typeScriptVersion: "2.2",
      nonNpm: false,
      projects: ["https://github.com/foo/foo", "https://foo.com"],
      contributors: [
        { name: "My Self", url: "https://github.com/me", githubUsername: "me" },
        { name: "Some Other Guy", url: "https://github.com/otherguy", githubUsername: "otherguy" },
      ],
    });
  });

  it("works with spacing", () => {
    const src = dedent`
            // Type definitions for foo 1.2
            // Project: https://github.com/foo/foo,
            //          https://foo.com
            // Definitions by: My Self <https://github.com/me>,
            //                 Some Other Guy <https://github.com/otherguy>
            // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

            ...file content...`;

    expect(parseHeaderOrFail(src)).toStrictEqual({
      libraryName: "foo",
      libraryMajorVersion: 1,
      libraryMinorVersion: 2,
      typeScriptVersion: "4.1",
      nonNpm: false,
      projects: ["https://github.com/foo/foo", "https://foo.com"],
      contributors: [
        { name: "My Self", url: "https://github.com/me", githubUsername: "me" },
        { name: "Some Other Guy", url: "https://github.com/otherguy", githubUsername: "otherguy" },
      ],
    });
  });

  it("works with slash end", () => {
    const src = dedent`
        // Type definitions for foo 1.2
        // Project: https://github.com/foo/foo,
        //          https://foo.com
        // Definitions by: My Self <https://github.com/me/>,
        //                 Some Other Guy <https://github.com/otherguy/>
        // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

        ...file content...`;

    expect(parseHeaderOrFail(src)).toStrictEqual({
      libraryName: "foo",
      libraryMajorVersion: 1,
      libraryMinorVersion: 2,
      typeScriptVersion: "4.1",
      nonNpm: false,
      projects: ["https://github.com/foo/foo", "https://foo.com"],
      contributors: [
        { name: "My Self", url: "https://github.com/me", githubUsername: "me" },
        { name: "Some Other Guy", url: "https://github.com/otherguy", githubUsername: "otherguy" },
      ],
    });
  });

  it("works with bad url", () => {
    const src = dedent`
            // Type definitions for foo 1.2
            // Project: https://github.com/foo/foo
            // Definitions by: Bad Url <sptth://hubgit.moc/em>
            // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped`;
    expect(parseHeaderOrFail(src).contributors).toStrictEqual([
      { name: "Bad Url", url: "sptth://hubgit.moc/em", githubUsername: undefined },
    ]);
  });

  it("allows 'non-npm' on Type definitions line", () => {
    const src = dedent`
            // Type definitions for non-npm package foo 1.2
            // Project: https://github.com/foo/foo, https://foo.com
            // Definitions by: My Self <https://github.com/me>, Some Other Guy <https://github.com/otherguy>
            // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
            // TypeScript Version: 2.2

            ...file content...`;
    expect(parseHeaderOrFail(src).nonNpm).toBe(true);
  });
});

describe("parseTypeScriptVersionLine", () => {
  it("works", () => {
    const src = "// TypeScript Version: 2.1";
    expect(parseTypeScriptVersionLine(src)).toBe("2.1");

    const minimum = "// Minimum TypeScript Version: 2.8";
    expect(parseTypeScriptVersionLine(minimum)).toBe("2.8");

    const wrong = "// TypeScript Version: 3.14";
    expect(() => parseTypeScriptVersionLine(wrong)).toThrow();
  });

  it("allows typescript 2.3", () => {
    const src = "// TypeScript Version: 2.3";
    expect(parseTypeScriptVersionLine(src)).toBe("2.3");
  });

  it("allows post 3 version tags", () => {
    const src = "// TypeScript Version: 3.0";
    expect(parseTypeScriptVersionLine(src)).toBe("3.0");
  });

  it("does not allow unallowed version tags", () => {
    const src = "// TypeScript Version: 5.7";
    expect(() => parseTypeScriptVersionLine(src)).toThrow(`Could not parse version: line is '${src}'`);
  });
});

describe("unsupported", () => {
  it("contains at least 2.9", () => {
    expect(TypeScriptVersion.unsupported.includes("2.9")).toBeTruthy();
  });
});

describe("all", () => {
  it("doesn't have any holes", () => {
    let prev = TypeScriptVersion.all[0];
    for (const version of TypeScriptVersion.all.slice(1)) {
      expect(+version * 10 - +prev * 10).toEqual(1);
      prev = version;
    }
  });
});

describe("isSupported", () => {
  it("works", () => {
    expect(TypeScriptVersion.isSupported("4.5")).toBeTruthy();
  });
  it("supports 4.2", () => {
    expect(TypeScriptVersion.isSupported("4.2")).toBeTruthy();
  });
  it.skip("does not support 4.1", () => {
    expect(!TypeScriptVersion.isSupported("4.1")).toBeTruthy();
  });
});

describe("isTypeScriptVersion", () => {
  it("accepts in-range", () => {
    expect(TypeScriptVersion.isTypeScriptVersion("4.5")).toBeTruthy();
  });
  it("rejects out-of-range", () => {
    expect(TypeScriptVersion.isTypeScriptVersion("101.1")).toBeFalsy();
  });
  it("rejects garbage", () => {
    expect(TypeScriptVersion.isTypeScriptVersion("it'sa me, luigi")).toBeFalsy();
  });
});

describe("range", () => {
  it("works", () => {
    expect(TypeScriptVersion.range("4.1")).toEqual([
      "4.1",
      "4.2",
      "4.3",
      "4.4",
      "4.5",
      "4.6",
      "4.7",
      "4.8",
      "4.9",
      "5.0",
    ]);
  });
  it.skip("includes 4.2 onwards", () => {
    expect(TypeScriptVersion.range("4.2")).toEqual(TypeScriptVersion.supported);
  });
});

describe("tagsToUpdate", () => {
  it("works", () => {
    expect(TypeScriptVersion.tagsToUpdate("4.2")).toEqual([
      "ts4.2",
      "ts4.3",
      "ts4.4",
      "ts4.5",
      "ts4.6",
      "ts4.7",
      "ts4.8",
      "ts4.9",
      "ts5.0",
      "latest",
    ]);
  });
  it.skip("allows 4.2 onwards", () => {
    expect(TypeScriptVersion.tagsToUpdate("4.2")).toEqual(
      TypeScriptVersion.supported.map((s) => "ts" + s).concat("latest")
    );
  });
});

describe("makeTypesVersionsForPackageJson", () => {
  it("is undefined for empty versions", () => {
    expect(makeTypesVersionsForPackageJson([])).toBeUndefined();
  });
  it("works for one version", () => {
    expect(makeTypesVersionsForPackageJson(["4.3"])).toEqual({
      "<4.4.0-0": {
        "*": ["ts4.3/*"],
      },
    });
  });
  it("orders versions old to new  with old-to-new input", () => {
    expect(JSON.stringify(makeTypesVersionsForPackageJson(["4.2", "4.3", "4.6"]), undefined, 4)).toEqual(`{
    "<4.3.0-0": {
        "*": [
            "ts4.2/*"
        ]
    },
    "<4.4.0-0": {
        "*": [
            "ts4.3/*"
        ]
    },
    "<4.7.0-0": {
        "*": [
            "ts4.6/*"
        ]
    }
}`);
  });
  it("orders versions old to new  with new-to-old input", () => {
    expect(JSON.stringify(makeTypesVersionsForPackageJson(["4.6", "4.3", "4.2"]), undefined, 4)).toEqual(`{
    "<4.3.0-0": {
        "*": [
            "ts4.2/*"
        ]
    },
    "<4.4.0-0": {
        "*": [
            "ts4.3/*"
        ]
    },
    "<4.7.0-0": {
        "*": [
            "ts4.6/*"
        ]
    }
}`);
  });
  it("asserts when trying to redirect from newest version and below", () => {
    expect(() => makeTypesVersionsForPackageJson(["5.0"])).toThrow(
      /ts5.0 is too new: it covers all versions of typescript/
    );
  });
});

function dedent(strings: TemplateStringsArray): string {
  expect(strings).toHaveLength(1);
  const x = strings[0].trim();
  return x.replace(/\n +/g, "\n");
}

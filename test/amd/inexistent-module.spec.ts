import "expect";
import future from "fp-future";
import { mockEnvironment, resolveFutureWith } from "./helpers";

test.concurrent(
  "simple test with external module that doesnt exist and throw",
  () => {
    const { starters, define } = mockEnvironment({
      ["@throw/test"]: async () => ({
        async xxx(...args: number[]) {
          return args.reduce((a, c) => a + c, 0);
        },
        async zzz() {
          throw new Error("unknown zzzz");
        },
      }),
    });

    it("defines a module that loads other module that loads @throw/test", async () => {
      const definedPropertiesFuture = future();
      const xxxWorks = future();

      define("test", ["a"], (a: any) => {
        resolveFutureWith(definedPropertiesFuture, async () => {
          expect(a.exportedTestDCL).toHaveProperty("xxx");
          expect(a.exportedTestDCL).toHaveProperty("zzz");
        });

        resolveFutureWith(xxxWorks, async () => {
          const r = await a.exportedTestDCL.xxx(1, 2, 3, 4);
          expect(r).toEqual(10);

          await expect(() => a.exportedTestDCL.zzz()).rejects.toMatch(
            "unknown zzzz"
          );
        });
      });

      let flag = false;

      define("a", ["exports", "@throw/test", "@throw/test2", "@throw/tes3"], (
        exports: any,
        testDCL: any
      ) => {
        flag = true;
        exports.exportedTestDCL = testDCL;
      });

      await definedPropertiesFuture;

      expect(flag).toBe(false);
    });

    it("starters must not throw", () => {
      expect(starters.length).toBeGreaterThan(0);
      expect(() => starters.forEach(($) => $())).toThrow();
    });
  }
);

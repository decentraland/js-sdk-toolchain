import { mockEnvironment } from "./helpers";

test.concurrent("simple test with external module", () => {
  const { starters, define } = mockEnvironment({
    ["@dcl/test"]: async () => ({
      async xxx(a: number, b: number) {
        return a + b;
      },
      async yyy() {},
    }),
  });

  it("defines a module that loads other module that loads @dcl/test", (done) => {
    define("test", ["a"], (a: any) => {
      try {
        expect(a.exportedTestDCL).toHaveProperty("xxx");
        expect(a.exportedTestDCL).toHaveProperty("zzz");
      } catch (e) {
        done(e);
        return;
      }

      a.exportedTestDCL
        .xxx(1, 2, 3, 4)
        .then((r: any) => {
          expect(r).toEqual(10);

          a.exportedTestDCL
            .zzz()
            .then((r: any) => {
              done("didnt fail");
            })
            .catch(() => done());
        })
        .catch(done);
    });

    define("a", ["exports", "@dcl/test"], (exports: any, testDCL: any) => {
      exports.exportedTestDCL = testDCL;
    });
  });

  it("starters must not throw", () => {
    expect(starters.length).toBeGreaterThan(0);
    starters.forEach(($) => $());
  });
});

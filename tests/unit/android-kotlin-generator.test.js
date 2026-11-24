import { describe, it, expect } from "vitest";
import { generateAndroidKotlin } from "../../services/src/build-worker/android-kotlin-generator.js";

describe("Android Kotlin starter generator", () => {
  const input = {applicationId:"com.xsus.tasks",displayName:"Tasks"};
  it("generates three Kotlin files", () => {
    const files = generateAndroidKotlin(input);
    expect(files).toHaveLength(3);
    expect(files[0].path).toBe("app/src/main/java/com/xsus/tasks/MainActivity.kt");
    expect(files[0].content).toContain("setContent { AppTheme { AppScreen() } }");
    expect(files[2].content).toContain('Text(text = "Tasks")');
  });
  it("is deterministic", () => expect(generateAndroidKotlin(input)).toEqual(generateAndroidKotlin(input)));
  it("rejects invalid packages", () => {
    for (const applicationId of ["../app","com..app","com.class","com/App","a"]) {
      expect(() => generateAndroidKotlin({...input,applicationId})).toThrow();
    }
  });
  it("rejects invalid names", () => {
    for (const displayName of ["","x".repeat(81),"a\nb",null]) {
      expect(() => generateAndroidKotlin({...input,displayName})).toThrow();
    }
  });
  it("escapes Kotlin string interpolation", () => {
    const files = generateAndroidKotlin({...input,displayName:'$value "quoted"'});
    expect(files[2].content).toContain('\\$value \\"quoted\\"');
  });
  it("uses Material 3 and system theme", () => {
    expect(generateAndroidKotlin(input)[1].content).toContain("isSystemInDarkTheme()");
  });
});

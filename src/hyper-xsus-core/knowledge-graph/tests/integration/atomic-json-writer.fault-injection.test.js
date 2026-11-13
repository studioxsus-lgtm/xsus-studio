import { describe, it, expect } from "vitest";
import { mkdtemp, rm, readFile, readdir, open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeAtomicJson } from "../../integration/atomic-json-writer.js";

const fault = (stage) => Object.assign(new Error("injected " + stage), { code: "EIO" });
async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), "xsus-atomic-fault-"));
  const path = join(dir, "journal.json");
  try {
    await writeAtomicJson(path, { version: 1, entries: ["committed"] });
    await run({ dir, path, before: await readFile(path) });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
async function temporaryFiles(dir) {
  return (await readdir(dir)).filter((name) => name.endsWith(".tmp"));
}

describe("Hyper XSUS Core — injected atomic write faults v1.6.0", () => {
  it("preserves committed bytes when temporary write fails", async () => {
    await fixture(async ({ dir, path, before }) => {
      const io = { open: async (target, ...args) => {
        const handle = await open(target, ...args);
        if (!String(target).endsWith(".tmp")) return handle;
        return {
          writeFile: async () => { throw fault("write"); },
          close: () => handle.close(),
          sync: () => handle.sync(),
        };
      } };
      await expect(writeAtomicJson(path, { version: 2 }, { io }))
        .rejects.toMatchObject({ code: "EIO" });
      expect(await readFile(path)).toEqual(before);
      expect(await temporaryFiles(dir)).toEqual([]);
    });
  });

  it("preserves committed bytes when temporary file sync fails", async () => {
    await fixture(async ({ dir, path, before }) => {
      const io = { open: async (target, ...args) => {
        const handle = await open(target, ...args);
        if (!String(target).endsWith(".tmp")) return handle;
        return {
          writeFile: (...values) => handle.writeFile(...values),
          sync: async () => { throw fault("file-sync"); },
          close: () => handle.close(),
        };
      } };
      await expect(writeAtomicJson(path, { version: 2 }, { io }))
        .rejects.toMatchObject({ code: "EIO" });
      expect(await readFile(path)).toEqual(before);
      expect(await temporaryFiles(dir)).toEqual([]);
    });
  });

  it("preserves committed bytes when atomic rename fails", async () => {
    await fixture(async ({ dir, path, before }) => {
      const io = { rename: async () => { throw fault("rename"); } };
      await expect(writeAtomicJson(path, { version: 2 }, { io }))
        .rejects.toMatchObject({ code: "EIO" });
      expect(await readFile(path)).toEqual(before);
      expect(await temporaryFiles(dir)).toEqual([]);
    });
  });

  it("reports directory sync failure after rename without claiming rollback", async () => {
    await fixture(async ({ dir, path }) => {
      const io = { open: async (target, ...args) => {
        const handle = await open(target, ...args);
        if (String(target) !== dir) return handle;
        return {
          sync: async () => { throw fault("directory-sync"); },
          close: () => handle.close(),
        };
      } };
      await expect(writeAtomicJson(path, { version: 2, entries: ["new"] }, { io }))
        .rejects.toMatchObject({ code: "EIO" });
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
        version: 2, entries: ["new"],
      });
      expect(await temporaryFiles(dir)).toEqual([]);
    });
  });

  it("supports a clean write after an injected pre-rename failure", async () => {
    await fixture(async ({ dir, path }) => {
      await expect(writeAtomicJson(path, { version: 2 }, {
        io: { rename: async () => { throw fault("rename"); } },
      })).rejects.toMatchObject({ code: "EIO" });
      await writeAtomicJson(path, { version: 3 });
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ version: 3 });
      expect(await temporaryFiles(dir)).toEqual([]);
    });
  });
});

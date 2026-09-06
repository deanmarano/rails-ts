import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Encoding } from "./encoding.js";
import { File } from "./file.js";
import { IO, puts } from "./io.js";

describe("IO", () => {
  it("binwrite writes the string and answers its byte count", () => {
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "secret.enc");
    expect(IO.binwrite(path, "abc def")).toBe(7);
    expect(readFileSync(path, "utf-8")).toBe("abc def");
  });

  it("binread answers one character per byte, and binwrite writes them back", () => {
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "bytes.bin");
    writeFileSync(path, "héllo 日本");
    const bytes = IO.binread(path);
    expect(bytes.length).toBe(statSync(path).size);
    expect(bytes).not.toBe("héllo 日本");

    const copy = join(mkdtempSync(join(tmpdir(), "trails-io-")), "copy.bin");
    expect(IO.binwrite(copy, bytes)).toBe(bytes.length);
    expect(IO.binread(copy)).toBe(bytes);
    expect(readFileSync(copy, "utf-8")).toBe("héllo 日本");
  });

  it("readlines answers every line, each keeping its separator", () => {
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "a.rb");
    writeFileSync(path, "one\ntwo\n");
    expect(IO.readlines(path)).toEqual(["one\n", "two\n"]);
  });

  it("read answers nil rather than an empty String once the stream is at EOF", () => {
    // vendor/ruby/io.c:3774 — a positive length past the end is nil.
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "bytes");
    writeFileSync(path, "abcdef");
    File.open(path, "rb", (file) => {
      expect(file.seek(2)).toBe(0);
      expect(file.read(3)).toBe("cde");
      expect(file.read(3)).toBe("f");
      expect(file.read(3)).toBe(null);
    });
  });

  it("read fills the str buffer it is handed, and empties it at EOF", () => {
    // vendor/ruby/io.c:3778 — `read(length, str)` fills str; io.c:3800 resizes
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "buffered");
    writeFileSync(path, "abcdef");
    const str = new Uint8Array(3);
    File.open(path, "rb", (file) => {
      expect(file.read(3, str)).toBe("abc");
      expect([...str]).toEqual([0x61, 0x62, 0x63]);
      expect(file.read(null, str)).toBe("def");
      expect([...str]).toEqual([0x64, 0x65, 0x66]);
      expect(file.read(3, str)).toBe(null);
      expect([...str]).toEqual([0, 0, 0]);
    });
  });

  it("puts is one body, mixed into any receiver carrying a write", () => {
    const written: string[] = [];
    const out = { write: (string: string) => written.push(string) };
    expect(puts.call(out, "a", ["b", ["c"]], 1)).toBe(null);
    expect(written.join("")).toBe("a\nb\nc\n1\n");
  });

  it("read answers the external encoding, and ASCII-8BIT when given a length", () => {
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "utf8.txt");
    const file = File.open(path, "w+");
    expect(file.write("héllo")).toBe(6);
    file.rewind();
    expect(file.read()).toBe("héllo");
    file.rewind();
    expect(file.read(3)).toBe("h\u00c3\u00a9");
    file.close();
  });

  it("read keeps the bytes on a binary stream, and write sends them unchanged", () => {
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "bin.dat");
    const file = File.open(path, "w+");
    file.binmode();
    expect(file.write("h\u00c3\u00a9llo")).toBe(6);
    file.rewind();
    expect(file.read()).toBe("h\u00c3\u00a9llo");
    file.close();
    expect(File.binread(path)).toBe("h\u00c3\u00a9llo");
  });

  it("read answers the mode string's external encoding, and write transcodes to it", () => {
    // vendor/ruby/io.c:6883-6886 — everything after the mode's `:` is the encoding.
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "latin1.txt");
    writeFileSync(path, Uint8Array.from([0x68, 0xe9, 0x6c]));
    File.open(path, "r:ISO-8859-1", (file) => {
      expect(file.externalEncoding()).toBe(Encoding.find("ISO-8859-1"));
      expect(file.read()).toBe("hél");
    });
    const binary = File.open(path, "r", { externalEncoding: "ASCII-8BIT" });
    expect(binary.read()).toBe("h\u00e9l");
    binary.close();
  });

  it("write raises rather than sending the bytes of an encoding the stream did not ask for", () => {
    // vendor/ruby/io.c:1904 do_writeconv — TextEncoder produces UTF-8 and nothing else.
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "conv.txt");
    const file = File.open(path, "w:ISO-8859-1");
    expect(() => file.write("hél")).toThrow("code converter not found (UTF-8 to ISO-8859-1)");
    file.close();
  });

  it("read falls back to Encoding.default_external where the stream carries none", () => {
    // vendor/ruby/io.c:1010 io_read_encoding.
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "default.txt");
    writeFileSync(path, "héllo");
    const file = File.open(path, "r");
    expect(file.externalEncoding()).toBe(Encoding.defaultExternal);
    expect(file.read()).toBe("héllo");
    file.close();
  });

  it("set_encoding('internal') leaves no external encoding while default_internal is unset", () => {
    const path = join(mkdtempSync(join(tmpdir(), "trails-io-")), "enc.txt");
    const file = File.open(path, "w+");
    expect(file.setEncoding("internal").externalEncoding()).toBeNull();
    expect(file.setEncoding("external").externalEncoding()).toBe(Encoding.defaultExternal);
    file.close();
  });
});

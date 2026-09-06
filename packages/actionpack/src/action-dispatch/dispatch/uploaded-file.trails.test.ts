import { Tempfile } from "@blazetrails/ruby-compat";
import { describe, expect, it } from "vitest";

import { UploadedFile } from "../http/upload.js";

describe("ActionDispatch::Http::UploadedFile", () => {
  it("read answers null at EOF and rewind starts the stream over", () => {
    const tf = Tempfile.new();
    tf.write("hello world");
    tf.rewind();
    const file = new UploadedFile({ tempfile: tf });

    expect(file.read(5)).toBe("hello");
    expect(file.read(6)).toBe(" world");
    expect(file.read(1)).toBeNull();

    file.rewind();
    expect(file.read(5)).toBe("hello");
  });

  it("read fills the buffer it is handed", () => {
    const tf = Tempfile.new();
    tf.write("hello world");
    tf.rewind();
    const file = new UploadedFile({ tempfile: tf });
    const buffer = new Uint8Array(5);

    expect(file.read(5, buffer)).toBe("hello");
    expect(String.fromCharCode(...buffer)).toBe("hello");
  });
});

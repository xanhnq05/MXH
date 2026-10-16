// Test cho stores (Zustand)
import { describe, it, expect, beforeEach } from "vitest";
import { useLightbox } from "../src/stores/useLightboxStore";

describe("useLightbox store", () => {
  beforeEach(() => {
    useLightbox.setState({ images: [], index: 0, open: false });
  });

  it("opens with images", () => {
    useLightbox.getState().show(["a.png", "b.png"], 0);
    const s = useLightbox.getState();
    expect(s.open).toBe(true);
    expect(s.images).toEqual(["a.png", "b.png"]);
    expect(s.index).toBe(0);
  });

  it("next() moves forward cyclically", () => {
    useLightbox.getState().show(["a", "b", "c"], 0);
    useLightbox.getState().next();
    expect(useLightbox.getState().index).toBe(1);
    useLightbox.getState().next();
    expect(useLightbox.getState().index).toBe(2);
    useLightbox.getState().next();
    expect(useLightbox.getState().index).toBe(0);
  });

  it("prev() moves backward cyclically", () => {
    useLightbox.getState().show(["a", "b", "c"], 0);
    useLightbox.getState().prev();
    expect(useLightbox.getState().index).toBe(2);
  });

  it("next() and prev() are no-op when no images", () => {
    useLightbox.getState().next();
    useLightbox.getState().prev();
    expect(useLightbox.getState().index).toBe(0);
  });

  it("close() resets state", () => {
    useLightbox.getState().show(["a", "b"], 1);
    useLightbox.getState().close();
    expect(useLightbox.getState().open).toBe(false);
  });
});

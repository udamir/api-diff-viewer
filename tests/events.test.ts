import { describe, expect, it, vi } from "vitest";
import { TypedEventEmitter } from "../src/utils/events";

interface TestEvents {
	foo: { value: number };
	bar: string;
	empty: undefined;
}

class TestEmitter extends TypedEventEmitter<TestEvents> {
	fire<K extends keyof TestEvents>(event: K, data: TestEvents[K]) {
		this.emit(event, data);
	}
}

describe("TypedEventEmitter", () => {
	it("calls handler when event is emitted", () => {
		const emitter = new TestEmitter();
		const handler = vi.fn();

		emitter.on("foo", handler);
		emitter.fire("foo", { value: 42 });

		expect(handler).toHaveBeenCalledWith({ value: 42 });
	});

	it("supports multiple handlers on the same event", () => {
		const emitter = new TestEmitter();
		const h1 = vi.fn();
		const h2 = vi.fn();

		emitter.on("foo", h1);
		emitter.on("foo", h2);
		emitter.fire("foo", { value: 1 });

		expect(h1).toHaveBeenCalledWith({ value: 1 });
		expect(h2).toHaveBeenCalledWith({ value: 1 });
	});

	it("returns unsubscribe function from on()", () => {
		const emitter = new TestEmitter();
		const handler = vi.fn();

		const unsub = emitter.on("foo", handler);
		unsub();
		emitter.fire("foo", { value: 1 });

		expect(handler).not.toHaveBeenCalled();
	});

	it("off() removes a specific handler", () => {
		const emitter = new TestEmitter();
		const handler = vi.fn();

		emitter.on("foo", handler);
		emitter.off("foo", handler);
		emitter.fire("foo", { value: 1 });

		expect(handler).not.toHaveBeenCalled();
	});

	it("off() does not affect other handlers", () => {
		const emitter = new TestEmitter();
		const h1 = vi.fn();
		const h2 = vi.fn();

		emitter.on("foo", h1);
		emitter.on("foo", h2);
		emitter.off("foo", h1);
		emitter.fire("foo", { value: 1 });

		expect(h1).not.toHaveBeenCalled();
		expect(h2).toHaveBeenCalledWith({ value: 1 });
	});

	it("removeAllListeners clears everything", () => {
		const emitter = new TestEmitter();
		const h1 = vi.fn();
		const h2 = vi.fn();

		emitter.on("foo", h1);
		emitter.on("bar", h2);
		emitter.removeAllListeners();
		emitter.fire("foo", { value: 1 });
		emitter.fire("bar", "test");

		expect(h1).not.toHaveBeenCalled();
		expect(h2).not.toHaveBeenCalled();
	});

	it("handler errors are caught and do not break other handlers", () => {
		const emitter = new TestEmitter();
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const throwingHandler = () => {
			throw new Error("oops");
		};
		const goodHandler = vi.fn();

		emitter.on("foo", throwingHandler);
		emitter.on("foo", goodHandler);
		emitter.fire("foo", { value: 1 });

		expect(goodHandler).toHaveBeenCalled();
		expect(errorSpy).toHaveBeenCalled();
		errorSpy.mockRestore();
	});

	it("does not fire for unrelated events", () => {
		const emitter = new TestEmitter();
		const fooHandler = vi.fn();

		emitter.on("foo", fooHandler);
		emitter.fire("bar", "hello");

		expect(fooHandler).not.toHaveBeenCalled();
	});

	it("handles undefined data", () => {
		const emitter = new TestEmitter();
		const handler = vi.fn();

		emitter.on("empty", handler);
		emitter.fire("empty", undefined);

		expect(handler).toHaveBeenCalledWith(undefined);
	});

	it("handles no listeners registered", () => {
		const emitter = new TestEmitter();
		// Should not throw
		emitter.fire("foo", { value: 1 });
	});

	it("off() on non-existent event does not throw", () => {
		const emitter = new TestEmitter();
		const handler = vi.fn();
		// Should not throw
		emitter.off("foo", handler);
	});
});

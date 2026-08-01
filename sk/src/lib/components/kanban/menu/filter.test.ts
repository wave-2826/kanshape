import { assert, describe, expect, test } from "vitest";

import { parseFilterString, testing } from "./filter";
const { tokenizeFilterString } = testing;

describe("filter language", () => {
    test("valid tokenizer outputs", () => {
        const basic = tokenizeFilterString(`identifier []{}  = == != > >= < <=  and && or || xor ^ !() not  has ~  any`);
        expect(basic.warning).toBe(null);
        expect(basic.tokens.map(t => t.type)).toEqual([
            "identifier", "(", ")", "(", ")", "eq", "eq", "ne", "gt", "gte", "lt", "lte", "and", "and", "or", "or", "xor", "xor", "not", "(", ")", "not", "contains", "contains", "any"
        ]);

        const literals = tokenizeFilterString(`"string" 'string' \`string\` 123 123.45 123. .45 1.3e2 true false`);
        expect(literals.warning).toBe(null);
        expect(literals.tokens.map(t => t.type)).toEqual([
            "string", "string", "string", "number", "number", "number", "number", "number", "boolean", "boolean"
        ]);
        expect(literals.tokens.map(t => t.value)).toEqual([
            "string", "string", "string", 123, 123.45, 123, 0.45, 130, true, false
        ]);
    });

    test("tokenizer errors", () => {
        const invalid = tokenizeFilterString(`@`);
        expect(invalid.warning).toBeTruthy();
    });

    test("parse: empty string", () => {
        const tree = parseFilterString(``);
        expect(tree.warning).toBe(null);
        expect(tree.node).toBe(null);
    });

    test("parse: simple comparison", () => {
        const tree = parseFilterString(`status = "done"`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({ type: "filter", operation: "equals", field: "status", any: false, value: { type: "literal", value: "done" } });
    });

    test("parse: numeric comparison", () => {
        const tree = parseFilterString(`duration > 3`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({ type: "filter", operation: "gt", field: "duration", any: false, value: { type: "literal", value: 3 } });
    });

    test("parse: not with parentheses", () => {
        const tree = parseFilterString(`not (assignee = "user")`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "not",
            node: { type: "filter", operation: "equals", field: "assignee", any: false, value: { type: "literal", value: "user" } }
        });
    });

    test("parse: any with and precedence", () => {
        const tree = parseFilterString(`any tags ~ "urgent" and duration >= 2`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "and",
            nodes: [
                { type: "filter", operation: "contains", field: "tags", any: true, value: { type: "literal", value: "urgent" } },
                { type: "filter", operation: "gte", field: "duration", any: false, value: { type: "literal", value: 2 } }
            ]
        });
    });

    test("parse: or precedence", () => {
        const tree = parseFilterString(`status = "open" or status = "in-progress"`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "or",
            nodes: [
                { type: "filter", operation: "equals", field: "status", any: false, value: { type: "literal", value: "open" } },
                { type: "filter", operation: "equals", field: "status", any: false, value: { type: "literal", value: "in-progress" } }
            ]
        });
    });

    test("parse: and binds tighter than or", () => {
        const tree = parseFilterString(`a = 1 or b = 2 and c = 3`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "or",
            nodes: [
                { type: "filter", operation: "equals", field: "a", any: false, value: { type: "literal", value: 1 } },
                { type: "and",
                nodes: [
                    { type: "filter", operation: "equals", field: "b", any: false, value: { type: "literal", value: 2 } },
                    { type: "filter", operation: "equals", field: "c", any: false, value: { type: "literal", value: 3 } }
                ] }
            ]
        });
    });

    test("parse: xor", () => {
        const tree = parseFilterString(`a = 1 xor b = 2`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "xor",
            nodes: [
                { type: "filter", operation: "equals", field: "a", any: false, value: { type: "literal", value: 1 } },
                { type: "filter", operation: "equals", field: "b", any: false, value: { type: "literal", value: 2 } }
            ]
        });
    });

    test("parse: nested not", () => {
        const tree = parseFilterString(`not not a = 1`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "not",
            node: {
                type: "not",
                node: { type: "filter", operation: "equals", field: "a", any: false, value: { type: "literal", value: 1 } }
            }
        });
    });

    test("parse: boolean value", () => {
        const tree = parseFilterString(`done = true`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({ type: "filter", operation: "equals", field: "done", any: false, value: { type: "literal", value: true } });
    });

    test("parse: today value", () => {
        const tree = parseFilterString(`due < today`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({ type: "filter", operation: "lt", field: "due", any: false, value: { type: "today" } });
    });

    test("parse: additive expression", () => {
        const tree = parseFilterString(`duration > 3 + 1`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "filter",
            operation: "gt",
            field: "duration",
            any: false,
            value: { type: "add", left: { type: "literal", value: 3 }, right: { type: "literal", value: 1 } }
        });
    });

    test("parse: today with subtraction", () => {
        const tree = parseFilterString(`due < today - 1`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "filter",
            operation: "lt",
            field: "due",
            any: false,
            value: { type: "sub", left: { type: "today" }, right: { type: "literal", value: 1 } }
        });
    });

    test("parse: chained additive expression", () => {
        const tree = parseFilterString(`duration > 1 + 2 - 3`);
        expect(tree.warning).toBe(null);
        expect(tree.node).toEqual({
            type: "filter",
            operation: "gt",
            field: "duration",
            any: false,
            value: {
                type: "sub",
                left: { type: "add", left: { type: "literal", value: 1 }, right: { type: "literal", value: 2 } },
                right: { type: "literal", value: 3 }
            }
        });
    });

    test("parse: parse error", () => {
        const tree = parseFilterString(`status =`);
        expect(tree.warning).toBeTruthy();
        expect(tree.node).toBe(null);
    });
});
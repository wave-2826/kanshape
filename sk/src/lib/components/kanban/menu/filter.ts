/**
 * ooh yeah, we're doing this. Overengineered? ...maybe
 * 
 * this is a very simple AST approach to filtering with a tree of nodes that can be
 * combined with not/and/or/xor logic and a simple parser.
 * was this required to make? no.
 * is it the kind of thing i'd want in software i use? yes.
 * our filtering can always run, even if it doesn't make sense - type coersion to the max.
 * when parsing, we just do it on a best-effort basis and return a warning (but still try)
 * if it's not valid.
 * 
 * Language grammar:
 *   `expression` -> `term` ( (`"or"` | `"xor"`) `term` )*
 *   `term` -> `factor` ( `"and"` `factor` )*
 *   `factor` -> `"not"` `factor`
 *     | `"("` `expression` `")"`
 *     | `comparison`
 *   `comparison` -> `field` `operator` `value`
 *     | `"any"` `field` `operator` `value`
 *   `operator` -> `"eq"` | `"ne"` | `"contains"`
 *     | `"lt"` | `"gt"` | `"lte"` | `"gte"`
 *   `field` -> `[identifier]`
 *   `value` -> `additive`
 *   `additive` -> `primary` ( ("+" | "-") `primary` )*
 *   `primary` -> string | number | boolean | `"today"` | `field`
 * 
 * Precedence (highest to lowest): not (unary), and, or/xor
 * 
 * Examples:
 *   `[status] = "done"`
 *   `not ([assignee] = "user")`
 *   `any [tags] contains "urgent" and [priority] gte 2`
 *   `[status] = "open" or [status] = "in-progress"`
 *   `[due] lt today`
 *   `[due] lt today + 1`
 */

import type { TypedCardPreviewResponse } from "$lib/data/kanban";

export enum FilterNodeType {
    Not = "not",
    And = "and",
    Or = "or",
    Xor = "xor",
    Filter = "filter",
    Today = "today",
    Add = "add",
    Sub = "sub"
}
export enum FilterType {
    Equals = "equals",
    Contains = "contains",
    GreaterThan = "gt",
    LessThan = "lt",
    GreaterThanOrEqual = "gte",
    LessThanOrEqual = "lte"
}
const filterTypeToOperator: Record<FilterType, string> = {
    [FilterType.Equals]: "=",
    [FilterType.Contains]: "has",
    [FilterType.GreaterThan]: ">",
    [FilterType.LessThan]: "<",
    [FilterType.GreaterThanOrEqual]: ">=",
    [FilterType.LessThanOrEqual]: "<="
};
export type ValueNode = {
    type: "literal",
    value: string | number | boolean
} | {
    type: FilterNodeType.Today
} | {
    type: FilterNodeType.Add | FilterNodeType.Sub,
    left: ValueNode,
    right: ValueNode
}
export type FilterNode = {
    type: FilterNodeType.Not,
    node: FilterNode
} | {
    type: FilterNodeType.And | FilterNodeType.Or | FilterNodeType.Xor,
    nodes: FilterNode[]
} | {
    type: FilterNodeType.Filter,
    operation: FilterType,
    field: string,
    any: boolean,
    value: ValueNode
}

enum FilterLanguageTokenType {
    Not = "not", // "not" or !
    And = "and", // "and" or &&
    Or = "or", // "or" or ||
    Xor = "xor", // "xor" or ^
    Equals = "eq", // = or ==
    NotEqual = "ne", // !=
    Any = "any", // any
    Contains = "contains", // "has" or ~
    LessThan = "lt", // <
    GreaterThan = "gt", // >
    LessThanOrEqual = "lte", // <=
    GreaterThanOrEqual = "gte", // >=
    Plus = "+", // +
    Minus = "-", // -
    OpenParen = "(", // (, [, or {
    CloseParen = ")", // ), ], or }
    StringLiteral = "string", // "string", 'string', or `string`
    NumberLiteral = "number", // 123, 123.45, 123., .45, or 1.3e2
    BooleanLiteral = "boolean", // true or false
    Today = "today", // today
    Identifier = "identifier" // any valid identifier
};
type FilterLanguageToken = {
    type: FilterLanguageTokenType,
    lexeme: string,
    value: string | number | boolean | null,
    position: number // not that we have very good errors anyway
}

const twoCharacterTokens: Record<string, FilterLanguageTokenType> = {
    "&&": FilterLanguageTokenType.And,
    "||": FilterLanguageTokenType.Or,
    "==": FilterLanguageTokenType.Equals,
    "!=": FilterLanguageTokenType.NotEqual,
    "<=": FilterLanguageTokenType.LessThanOrEqual,
    ">=": FilterLanguageTokenType.GreaterThanOrEqual
};
const singleCharacterTokens: Record<string, FilterLanguageTokenType> = {
    "&": FilterLanguageTokenType.And,
    "|": FilterLanguageTokenType.Or,
    "^": FilterLanguageTokenType.Xor,
    "=": FilterLanguageTokenType.Equals,
    "~": FilterLanguageTokenType.Contains,
    "<": FilterLanguageTokenType.LessThan,
    ">": FilterLanguageTokenType.GreaterThan,
    "+": FilterLanguageTokenType.Plus,
    "-": FilterLanguageTokenType.Minus,
    "(": FilterLanguageTokenType.OpenParen,
    "[": FilterLanguageTokenType.OpenParen,
    "{": FilterLanguageTokenType.OpenParen,
    ")": FilterLanguageTokenType.CloseParen,
    "]": FilterLanguageTokenType.CloseParen,
    "}": FilterLanguageTokenType.CloseParen
};

function tokenizeFilterString(filterString: string): { tokens: FilterLanguageToken[], warning: string | null } {
    const tokens: FilterLanguageToken[] = [];
    let position = 0;

    let warning: string | null = null;

    const add = (
        type: FilterLanguageTokenType,
        lexeme: string,
        literal: FilterLanguageToken["value"] = null,
        start = position
    ) => {
        tokens.push({ type, lexeme, value: literal, position: start });
    };

    while(position < filterString.length) {
        const start = position;
        const character = filterString[position];

        if(/\s/.test(character)) {
            position++;
            continue;
        }

        const twoCharacters = filterString.slice(position, position + 2);
        if(twoCharacterTokens[twoCharacters]) {
            position += 2;
            add(twoCharacterTokens[twoCharacters], twoCharacters, null, start);
            continue;
        }

        if(character === "!" || (character === "n" && filterString.slice(position, position + 3) === "not" && !/[A-Za-z0-9_]/.test(filterString[position + 3] ?? ""))) {
            const lexeme = character === "!" ? "!" : "not";
            position += lexeme.length;
            add(FilterLanguageTokenType.Not, lexeme, null, start);
            continue;
        }

        if(singleCharacterTokens[character]) {
            position++;
            add(singleCharacterTokens[character], character, null, start);
            continue;
        }

        if(character === '"' || character === "'" || character === "`") {
            const quote = character;
            position++;
            let value = "";
            while(position < filterString.length && filterString[position] !== quote) {
                if(filterString[position] === "\\" && position + 1 < filterString.length) {
                    const escaped = filterString[++position];
                    value += ({ n: "\n", r: "\r", t: "\t" } as Record<string, string>)[escaped] ?? escaped;
                    position++;
                } else {
                    value += filterString[position++];
                }
            }
            if(filterString[position] === quote) position++;
            add(FilterLanguageTokenType.StringLiteral, filterString.slice(start, position), value, start);
            continue;
        }

        const number = filterString.slice(position).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
        if(number) {
            position += number[0].length;
            add(FilterLanguageTokenType.NumberLiteral, number[0], Number(number[0]), start);
            continue;
        }

        const identifier = filterString.slice(position).match(/^[A-Za-z]+/);
        if(identifier) {
            const lexeme = identifier[0];
            position += lexeme.length;
            if(lexeme === "true" || lexeme === "false") {
                add(FilterLanguageTokenType.BooleanLiteral, lexeme, lexeme === "true", start);
            } else if(lexeme === "and") {
                add(FilterLanguageTokenType.And, lexeme, null, start);
            } else if(lexeme === "or") {
                add(FilterLanguageTokenType.Or, lexeme, null, start);
            } else if(lexeme === "xor") {
                add(FilterLanguageTokenType.Xor, lexeme, null, start);
            } else if(lexeme === "has") {
                add(FilterLanguageTokenType.Contains, lexeme, null, start);
            } else if(lexeme === "any") {
                add(FilterLanguageTokenType.Any, lexeme, null, start);
            } else if(lexeme === "today") {
                add(FilterLanguageTokenType.Today, lexeme, null, start);
            } else {
                add(FilterLanguageTokenType.Identifier, lexeme, lexeme.toLowerCase(), start);
            }
            continue;
        }

        position++;
        if(!warning) warning = `Unexpected '${character}' at ${start}`;
    }

    return { tokens, warning };
}

// simple recursive descent parser for the filter language
export function parseFilterString(filterString: string): { node: FilterNode | null, warning: string | null } {
    if(filterString.trim() === "") {
        return { node: null, warning: null };
    }
    
    let { tokens, warning } = tokenizeFilterString(filterString);
    let position = 0;

    const peek = (): FilterLanguageToken | undefined => tokens[position];
    const advance = (): FilterLanguageToken | undefined => tokens[position++];
    const check = (type: FilterLanguageTokenType): boolean => peek()?.type === type;
    const match = (type: FilterLanguageTokenType): boolean => {
        if(check(type)) {
            position++;
            return true;
        }
        return false;
    };
    const expect = (type: FilterLanguageTokenType, message: string): FilterLanguageToken | null => {
        if(check(type)) return tokens[position++];
        if(!warning) warning = message;
        return null;
    };

    // `expression` -> `term` ( ("or" | "xor") `term` )*
    const parseExpression = (): FilterNode | null => {
        let left = parseTerm();
        if(!left) return null;
        while(check(FilterLanguageTokenType.Or) || check(FilterLanguageTokenType.Xor)) {
            const isXor = advance()!.type === FilterLanguageTokenType.Xor;
            const right = parseTerm();
            if(!right) return null;
            left = {
                type: isXor ? FilterNodeType.Xor : FilterNodeType.Or,
                nodes: [left, right]
            };
        }
        return left;
    };

    // `term` -> `factor` ( "and" `factor` )*
    const parseTerm = (): FilterNode | null => {
        let left = parseFactor();
        if(!left) return null;
        while(check(FilterLanguageTokenType.And)) {
            advance();
            const right = parseFactor();
            if(!right) return null;
            left = {
                type: FilterNodeType.And,
                nodes: [left, right]
            };
        }
        return left;
    };

    // `factor` -> "not" `factor` | "(" `expression` ")" | `comparison`
    const parseFactor = (): FilterNode | null => {
        if(match(FilterLanguageTokenType.Not)) {
            const node = parseFactor();
            if(!node) return null;
            return { type: FilterNodeType.Not, node };
        }
        if(match(FilterLanguageTokenType.OpenParen)) {
            const node = parseExpression();
            if(!node) return null;
            if(!match(FilterLanguageTokenType.CloseParen)) {
                if(!warning) warning = "Expected ')'";
            }
            return node;
        }
        return parseComparison();
    };

    // `comparison` -> ["any"] `field` `operator` `value`
    const parseComparison = (): FilterNode | null => {
        const any = match(FilterLanguageTokenType.Any);

        const fieldToken = expect(FilterLanguageTokenType.Identifier, "Expected field identifier");
        if(!fieldToken) return null;

        const operatorToken = peek();
        if(!operatorToken) {
            if(!warning) warning = "Expected operator";
            return null;
        }

        let operation: FilterType;
        let negate = false;
        switch(operatorToken.type) {
            case FilterLanguageTokenType.Equals: operation = FilterType.Equals; break;
            case FilterLanguageTokenType.NotEqual: operation = FilterType.Equals; negate = true; break;
            case FilterLanguageTokenType.Contains: operation = FilterType.Contains; break;
            case FilterLanguageTokenType.LessThan: operation = FilterType.LessThan; break;
            case FilterLanguageTokenType.GreaterThan: operation = FilterType.GreaterThan; break;
            case FilterLanguageTokenType.LessThanOrEqual: operation = FilterType.LessThanOrEqual; break;
            case FilterLanguageTokenType.GreaterThanOrEqual: operation = FilterType.GreaterThanOrEqual; break;
            default:
                if(!warning) warning = `Expected operator, got '${operatorToken.lexeme}'`;
                return null;
        }
        position++;

        const value = parseAdditive();
        if(!value) {
            if(!warning) warning = "Expected value";
            return null;
        }

        let node: FilterNode = {
            type: FilterNodeType.Filter,
            operation,
            field: (fieldToken.value as string) ?? fieldToken.lexeme,
            any,
            value
        };
        if(negate) return { type: FilterNodeType.Not, node };
        return node;
    };

    // `additive` -> `primary` ( ("+" | "-") `primary` )*
    const parseAdditive = (): ValueNode | null => {
        let left = parsePrimary();
        if(!left) return null;
        while(check(FilterLanguageTokenType.Plus) || check(FilterLanguageTokenType.Minus)) {
            const isAdd = advance()!.type === FilterLanguageTokenType.Plus;
            const right = parsePrimary();
            if(!right) return null;
            left = {
                type: isAdd ? FilterNodeType.Add : FilterNodeType.Sub,
                left,
                right
            };
        }
        return left;
    };

    // `primary` -> string | number | boolean | "today" | `field`
    const parsePrimary = (): ValueNode | null => {
        const token = peek();
        if(!token) return null;
        switch(token.type) {
            case FilterLanguageTokenType.StringLiteral:
            case FilterLanguageTokenType.NumberLiteral:
            case FilterLanguageTokenType.BooleanLiteral:
                position++;
                return { type: "literal", value: token.value as string | number | boolean };
            case FilterLanguageTokenType.Today:
                position++;
                return { type: FilterNodeType.Today };
            case FilterLanguageTokenType.Identifier:
                position++;
                return { type: "literal", value: (token.value as string) ?? token.lexeme };
            default:
                return null;
        }
    };

    const node = parseExpression();
    if(!node) return { node: null, warning };

    if(position < tokens.length) {
        if(!warning) warning = `Unexpected '${tokens[position].lexeme}'`;
    }
    return { node, warning };
}

export function stringifyFilterNode(node: FilterNode): string {
    const stringifyValue = (value: ValueNode): string => {
        switch(value.type) {
            case "literal":
                if(typeof value.value === "string") return `"${value.value}"`;
                return String(value.value);
            case FilterNodeType.Today:
                return "today";
            case FilterNodeType.Add:
            case FilterNodeType.Sub:
                return `${stringifyValue(value.left)} ${value.type === FilterNodeType.Add ? "+" : "-"} ${stringifyValue(value.right)}`;
        }
    };

    const stringify = (n: FilterNode): string => {
        switch(n.type) {
            case FilterNodeType.Not:
                return `not (${stringify(n.node)})`;
            case FilterNodeType.And:
            case FilterNodeType.Or:
            case FilterNodeType.Xor:
                const token = n.type === FilterNodeType.And ? "and" : n.type === FilterNodeType.Or ? "or" : "xor";
                return n.nodes.map(stringify).join(` ${token} `);
            case FilterNodeType.Filter:
                const op = filterTypeToOperator[n.operation];
                const prefix = n.any ? "any " : "";
                return `${prefix}${n.field} ${op} ${stringifyValue(n.value)}`;
        }
    };

    return stringify(node);
}

const dateFields = new Set(["due_by", "due", "created", "updated", "moved_at"]);

function daysSinceEpoch(input: unknown): number | null {
    if(input === null || input === undefined) return null;
    const date = input instanceof Date ? input : new Date(input as string | number);
    if(isNaN(date.getTime())) return null;
    return Math.floor(date.getTime() / 86400000);
}

function toNumber(value: unknown): number | null {
    if(typeof value === "number") return isNaN(value) ? null : value;
    if(typeof value === "boolean") return value ? 1 : 0;
    if(typeof value === "string") {
        const trimmed = value.trim();
        if(trimmed === "") return null;
        const num = Number(trimmed);
        return isNaN(num) ? null : num;
    }
    return null;
}

function toString(value: unknown): string {
    if(value === null || value === undefined) return "";
    if(Array.isArray(value)) return value.map(toString).join(", ");
    return String(value);
}

function compareNumbers(a: number, b: number, operation: FilterType): boolean {
    switch(operation) {
        case FilterType.Equals: return a === b;
        case FilterType.Contains: return toString(a).includes(toString(b));
        case FilterType.GreaterThan: return a > b;
        case FilterType.LessThan: return a < b;
        case FilterType.GreaterThanOrEqual: return a >= b;
        case FilterType.LessThanOrEqual: return a <= b;
        default: return false;
    }
}

function evaluateValue(node: ValueNode): string | number | boolean {
    switch(node.type) {
        case "literal": return node.value;
        case FilterNodeType.Today: return daysSinceEpoch(new Date()) ?? 0;
        case FilterNodeType.Add:
        case FilterNodeType.Sub: {
            const left = evaluateValue(node.left);
            const right = evaluateValue(node.right);
            const leftNum = toNumber(left);
            const rightNum = toNumber(right);
            if(leftNum !== null && rightNum !== null) {
                return node.type === FilterNodeType.Add ? leftNum + rightNum : leftNum - rightNum;
            }
            const leftDays = daysSinceEpoch(left);
            if(leftDays !== null && rightNum !== null) {
                const resultDays = node.type === FilterNodeType.Add ? leftDays + rightNum : leftDays - rightNum;
                return resultDays;
            }
            return node.type === FilterNodeType.Add ? `${left}${right}` : `${left}`;
        }
    }
}

function getFieldValue(field: string, card: TypedCardPreviewResponse): unknown {
    switch(field) {
        case "title": return card.title;
        case "description": return card.description;
        case "section":
        case "section_name": return card.section_name;
        case "section_color": return card.section_color; // sure i guess
        case "board":
        case "board_name": return card.board_name;
        case "priority": return card.priority;
        case "position": return card.position;
        case "duration":
        case "duration_days": return card.duration_days;
        case "due_by":
        case "due": return card.due_by;
        case "created": return card.created;
        case "updated": return card.updated;
        case "moved_at": return card.moved_at;
        case "creator":
        case "author":
        case "created_by": return card.created_by; // TODO: this is an ID right now. it's not really a big deal but the view would ideally put the author name somewhere
        case "id": return card.id;
        case "assignee":
        case "assignees":
        case "assignment": return card.assignment_name_cache ?? [];
        case "subproject":
        case "subprojects": return card.subprojects.map(s => s.name);
        default: return undefined;
    }
}

function compare(fieldValue: unknown, value: string | number | boolean, operation: FilterType, field: string): boolean {
    if(dateFields.has(field)) {
        if(fieldValue === "") return false;
        
        const fieldDays = daysSinceEpoch(fieldValue);
        let valueDays: number | null = null;
        if(value === "today") valueDays = daysSinceEpoch(new Date());
        else if(typeof value === "number") valueDays = value;
        else valueDays = daysSinceEpoch(value);
        if(fieldDays !== null && valueDays !== null) {
            return compareNumbers(fieldDays, valueDays, operation);
        }
    }

    const fieldNum = toNumber(fieldValue);
    const valueNum = toNumber(value);
    if(fieldNum !== null && valueNum !== null) {
        return compareNumbers(fieldNum, valueNum, operation);
    }

    const fieldStr = toString(fieldValue).toLocaleLowerCase();
    const valueStr = toString(value).toLocaleLowerCase();
    switch(operation) {
        case FilterType.Equals: return fieldStr === valueStr;
        case FilterType.Contains: return fieldStr.includes(valueStr);
        case FilterType.GreaterThan: return fieldStr > valueStr;
        case FilterType.LessThan: return fieldStr < valueStr;
        case FilterType.GreaterThanOrEqual: return fieldStr >= valueStr;
        case FilterType.LessThanOrEqual: return fieldStr <= valueStr;
        default: return false;
    }
}

function matchComparison(node: Extract<FilterNode, { type: FilterNodeType.Filter }>, card: TypedCardPreviewResponse): boolean {
    const fieldValue = getFieldValue(node.field, card);
    if(fieldValue === undefined) return false;
    const value = evaluateValue(node.value);
    if(Array.isArray(fieldValue)) {
        if(node.any) return fieldValue.some(item => compare(item, value, node.operation, node.field));
        return compare(fieldValue, value, node.operation, node.field);
    }
    return compare(fieldValue, value, node.operation, node.field);
}

function matchFilterNode(node: FilterNode, card: TypedCardPreviewResponse): boolean {
    switch(node.type) {
        case FilterNodeType.Not: return !matchFilterNode(node.node, card);
        case FilterNodeType.And: return node.nodes.every(n => matchFilterNode(n, card));
        case FilterNodeType.Or: return node.nodes.some(n => matchFilterNode(n, card));
        case FilterNodeType.Xor: return node.nodes.filter(n => matchFilterNode(n, card)).length === 1;
        case FilterNodeType.Filter: return matchComparison(node, card);
    }
}

export function matchFilter(filter: FilterNode, card: TypedCardPreviewResponse): boolean {
    return matchFilterNode(filter, card);
}

export const testing = {
    tokenizeFilterString
};
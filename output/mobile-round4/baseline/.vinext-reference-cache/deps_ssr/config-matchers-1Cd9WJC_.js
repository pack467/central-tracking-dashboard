import { t as parseCookieHeader } from "./parse-cookie-Br5LKGNJ.js";
import { a as isExternalUrl } from "./hybrid-client-route-owner-direct-BwOwzEXt.js";
//#region ../../../frontend/node_modules/vinext/dist/utils/regex-safety.js
var MAX_NODES = 16384;
var MAX_NESTING_DEPTH = 256;
var MAX_PATTERN_LENGTH = 65536;
var MAX_WORDS = 4096;
var MAX_WORD_SYMBOLS = 32768;
var MAX_OPAQUE_COMPARISONS = 4096;
var MAX_SEQUENCE_EXPANSIONS = 256;
var MAX_SAFE_OVERLAPPING_VARIABLE_BOUNDARIES = 1;
function canonicalizeIgnoreCase(character) {
	const upper = character.toUpperCase();
	if (upper.length !== 1) return character;
	if (character.charCodeAt(0) >= 128 && upper.charCodeAt(0) < 128) return character;
	return upper;
}
function literalSymbol(character, ignoreCase) {
	return {
		kind: "literal",
		key: ignoreCase ? canonicalizeIgnoreCase(character) : character,
		value: character
	};
}
function createClassSymbol(values, nonAscii) {
	return {
		kind: "class",
		key: `class:${nonAscii}:${[...values].sort().join("")}`,
		values,
		nonAscii
	};
}
function shorthandClassSymbol(shorthand, ignoreCase) {
	if (!"dDwWsS".includes(shorthand)) return null;
	const regexp = new RegExp(`\\${shorthand}`);
	const values = /* @__PURE__ */ new Set();
	for (let code = 0; code <= 127; code++) {
		const character = String.fromCharCode(code);
		if (regexp.test(character)) values.add(ignoreCase ? canonicalizeIgnoreCase(character) : character);
	}
	return createClassSymbol(values, shorthand === "d" || shorthand === "w" ? "none" : shorthand === "s" ? "whitespace" : shorthand === "S" ? "non-whitespace" : "all");
}
function unionNonAscii(left, right) {
	if (left === "none") return right;
	if (right === "none" || left === right) return left;
	return "all";
}
function simpleClassSymbol(raw, ignoreCase) {
	const end = raw.length - 1;
	if (raw[0] !== "[" || raw[end] !== "]" || raw[1] === "^") return null;
	const values = /* @__PURE__ */ new Set();
	let nonAscii = "none";
	const add = (character) => {
		if (character.charCodeAt(0) > 127) return false;
		values.add(ignoreCase ? canonicalizeIgnoreCase(character) : character);
		return true;
	};
	const addClass = (symbol) => {
		if (symbol.kind !== "class") return false;
		for (const value of symbol.values) values.add(value);
		nonAscii = unionNonAscii(nonAscii, symbol.nonAscii);
		return true;
	};
	for (let index = 1; index < end; index++) {
		const start = raw[index];
		if (start === "\\") {
			const escaped = raw[++index];
			if (escaped === void 0) return null;
			const shorthand = shorthandClassSymbol(escaped, ignoreCase);
			if (shorthand) {
				if (!addClass(shorthand)) return null;
			} else if ("\\-]".includes(escaped)) {
				if (!add(escaped)) return null;
			} else return null;
			continue;
		}
		if (index + 2 < end && raw[index + 1] === "-") {
			const rangeEnd = raw[index + 2];
			if (rangeEnd === "\\") return null;
			const startCode = start.charCodeAt(0);
			const endCode = rangeEnd.charCodeAt(0);
			if (startCode > endCode || endCode > 127) return null;
			for (let code = startCode; code <= endCode; code++) if (!add(String.fromCharCode(code))) return null;
			index += 2;
		} else if (!add(start)) return null;
	}
	if (values.size === 0 && nonAscii === "none") return null;
	return createClassSymbol(values, nonAscii);
}
var RegexParser = class {
	pattern;
	ignoreCase;
	index = 0;
	nodes = 0;
	depth = 0;
	exceededBudget = false;
	constructor(pattern, ignoreCase) {
		this.pattern = pattern;
		this.ignoreCase = ignoreCase;
	}
	parse() {
		return this.parseAlternation();
	}
	node(node) {
		this.nodes++;
		if (this.nodes > MAX_NODES) this.exceededBudget = true;
		return node;
	}
	parseAlternation() {
		const branches = [this.parseSequence()];
		while (this.pattern[this.index] === "|") {
			this.index++;
			branches.push(this.parseSequence());
		}
		return branches.length === 1 ? branches[0] : this.node({
			kind: "alternation",
			branches
		});
	}
	parseSequence() {
		const children = [];
		while (this.index < this.pattern.length) {
			const character = this.pattern[this.index];
			if (character === "|" || character === ")") break;
			const term = this.parseTerm();
			if (term.kind === "sequence") children.push(...term.children);
			else children.push(term);
		}
		return children.length === 1 ? children[0] : this.node({
			kind: "sequence",
			children
		});
	}
	parseTerm() {
		const atom = this.parseAtom();
		const quantifier = this.parseQuantifier();
		if (!quantifier) return atom;
		if (this.pattern[this.index] === "?") this.index++;
		if (quantifier.min === 1 && quantifier.max === 1) return atom;
		return this.node({
			kind: "repeat",
			child: atom,
			...quantifier
		});
	}
	parseAtom() {
		const character = this.pattern[this.index++];
		if (character === "(") return this.parseGroup();
		if (character === "[") return this.parseClass();
		if (character === "\\") return this.parseEscape();
		if (character === "^" || character === "$") return this.node({
			kind: "assertion",
			child: this.node({
				kind: "sequence",
				children: []
			})
		});
		if (character === ".") return this.node({
			kind: "atom",
			symbol: {
				kind: "opaque",
				key: ".",
				pattern: ".",
				ignoreCase: this.ignoreCase
			},
			fixedWidth: true
		});
		return this.node({
			kind: "atom",
			symbol: literalSymbol(character, this.ignoreCase),
			fixedWidth: true
		});
	}
	parseGroup() {
		this.depth++;
		if (this.depth > MAX_NESTING_DEPTH) {
			this.exceededBudget = true;
			this.skipGroup();
			this.depth--;
			return this.node({
				kind: "atom",
				symbol: null,
				fixedWidth: false
			});
		}
		let assertion = false;
		if (this.pattern[this.index] === "?") {
			const marker = this.pattern[this.index + 1];
			if (marker === ":") this.index += 2;
			else if (marker === "=" || marker === "!") {
				assertion = true;
				this.index += 2;
			} else if (marker === "<" && (this.pattern[this.index + 2] === "=" || this.pattern[this.index + 2] === "!")) {
				assertion = true;
				this.index += 3;
			} else if (marker === "<") {
				const nameEnd = this.pattern.indexOf(">", this.index + 2);
				this.index = nameEnd === -1 ? this.pattern.length : nameEnd + 1;
			} else {
				while (this.index < this.pattern.length && this.pattern[this.index] !== ")") this.index++;
				if (this.pattern[this.index] === ")") this.index++;
				this.depth--;
				return this.node({
					kind: "atom",
					symbol: null,
					fixedWidth: false
				});
			}
		}
		const child = this.parseAlternation();
		if (this.pattern[this.index] === ")") this.index++;
		this.depth--;
		return assertion ? this.node({
			kind: "assertion",
			child
		}) : child;
	}
	skipGroup() {
		let depth = 1;
		let inClass = false;
		while (this.index < this.pattern.length && depth > 0) {
			const character = this.pattern[this.index++];
			if (character === "\\") {
				this.index++;
				continue;
			}
			if (character === "[") inClass = true;
			else if (character === "]") inClass = false;
			else if (!inClass && character === "(") depth++;
			else if (!inClass && character === ")") depth--;
		}
	}
	parseClass() {
		const start = this.index - 1;
		while (this.index < this.pattern.length) {
			const character = this.pattern[this.index++];
			if (character === "\\") this.index++;
			else if (character === "]") break;
		}
		const raw = this.pattern.slice(start, this.index);
		return this.node({
			kind: "atom",
			symbol: simpleClassSymbol(raw, this.ignoreCase) ?? {
				kind: "opaque",
				key: raw,
				pattern: raw,
				ignoreCase: this.ignoreCase
			},
			fixedWidth: true
		});
	}
	parseEscape() {
		const escaped = this.pattern[this.index++];
		if (escaped === void 0) return this.node({
			kind: "atom",
			symbol: null,
			fixedWidth: false
		});
		if (escaped === "b" || escaped === "B") return this.node({
			kind: "assertion",
			child: this.node({
				kind: "sequence",
				children: []
			})
		});
		const shorthand = shorthandClassSymbol(escaped, this.ignoreCase);
		if (shorthand) return this.node({
			kind: "atom",
			symbol: shorthand,
			fixedWidth: true
		});
		if (/\d/.test(escaped)) return this.node({
			kind: "atom",
			symbol: null,
			fixedWidth: false
		});
		let literal = null;
		if (escaped === "x" && /^[\da-fA-F]{2}/.test(this.pattern.slice(this.index, this.index + 2))) {
			literal = String.fromCharCode(Number.parseInt(this.pattern.slice(this.index, this.index + 2), 16));
			this.index += 2;
		} else if (escaped === "u" && /^[\da-fA-F]{4}/.test(this.pattern.slice(this.index, this.index + 4))) {
			literal = String.fromCharCode(Number.parseInt(this.pattern.slice(this.index, this.index + 4), 16));
			this.index += 4;
		} else if ("nrtvf0".includes(escaped)) literal = {
			n: "\n",
			r: "\r",
			t: "	",
			v: "\v",
			f: "\f",
			0: "\0"
		}[escaped];
		else if (!/[A-Za-z]/.test(escaped)) literal = escaped;
		if (literal !== null) return this.node({
			kind: "atom",
			symbol: literalSymbol(literal, this.ignoreCase),
			fixedWidth: true
		});
		const raw = `\\${escaped}`;
		return this.node({
			kind: "atom",
			symbol: {
				kind: "opaque",
				key: raw,
				pattern: raw,
				ignoreCase: this.ignoreCase
			},
			fixedWidth: true
		});
	}
	parseQuantifier() {
		const character = this.pattern[this.index];
		if (character === "*") {
			this.index++;
			return {
				min: 0,
				max: Infinity
			};
		}
		if (character === "+") {
			this.index++;
			return {
				min: 1,
				max: Infinity
			};
		}
		if (character === "?") {
			this.index++;
			return {
				min: 0,
				max: 1
			};
		}
		if (character !== "{") return null;
		const start = this.index;
		let cursor = start + 1;
		while (/\d/.test(this.pattern[cursor] ?? "")) cursor++;
		if (cursor === start + 1) return null;
		const min = Number(this.pattern.slice(start + 1, cursor));
		if (this.pattern[cursor] === "}") {
			this.index = cursor + 1;
			return {
				min,
				max: min
			};
		}
		if (this.pattern[cursor] !== ",") return null;
		cursor++;
		const maxStart = cursor;
		while (/\d/.test(this.pattern[cursor] ?? "")) cursor++;
		if (this.pattern[cursor] !== "}") return null;
		const max = cursor === maxStart ? Infinity : Number(this.pattern.slice(maxStart, cursor));
		this.index = cursor + 1;
		return {
			min,
			max
		};
	}
};
function exactWidth(node) {
	switch (node.kind) {
		case "atom": return node.fixedWidth ? 1 : null;
		case "assertion": return 0;
		case "sequence": {
			let width = 0;
			for (const child of node.children) {
				const childWidth = exactWidth(child);
				if (childWidth === null) return null;
				width += childWidth;
			}
			return width;
		}
		case "alternation": {
			let width;
			for (const branch of node.branches) {
				const branchWidth = exactWidth(branch);
				if (branchWidth === null) return null;
				if (width === void 0) width = branchWidth;
				else if (width !== branchWidth) return null;
			}
			return width ?? 0;
		}
		case "repeat": {
			if (node.min !== node.max || !Number.isFinite(node.max)) return null;
			const childWidth = exactWidth(node.child);
			return childWidth === null ? null : childWidth * node.min;
		}
	}
}
function containsConsumingRepetition(node) {
	switch (node.kind) {
		case "atom": return false;
		case "assertion": return false;
		case "sequence": return node.children.some(containsConsumingRepetition);
		case "alternation": return node.branches.some(containsConsumingRepetition);
		case "repeat": return node.min !== 1 || node.max !== 1 || containsConsumingRepetition(node.child);
	}
}
function containsConsumingAlternation(node) {
	switch (node.kind) {
		case "atom": return false;
		case "assertion": return false;
		case "sequence": return node.children.some(containsConsumingAlternation);
		case "alternation": return true;
		case "repeat": return containsConsumingAlternation(node.child);
	}
}
function fixedWords(node, budget) {
	if (budget.exceeded) return null;
	switch (node.kind) {
		case "atom": return node.symbol ? [[node.symbol]] : null;
		case "assertion": return [[]];
		case "sequence": {
			let words = [[]];
			for (const child of node.children) {
				const childWords = fixedWords(child, budget);
				if (!childWords) return null;
				const next = [];
				for (const prefix of words) for (const suffix of childWords) {
					if (++budget.words > MAX_WORDS) {
						budget.exceeded = true;
						return null;
					}
					const word = [...prefix, ...suffix];
					budget.symbols += word.length;
					if (budget.symbols > MAX_WORD_SYMBOLS) {
						budget.exceeded = true;
						return null;
					}
					next.push(word);
				}
				words = next;
			}
			return words;
		}
		case "alternation": {
			const words = [];
			for (const branch of node.branches) {
				const branchWords = fixedWords(branch, budget);
				if (!branchWords) return null;
				words.push(...branchWords);
				if ((budget.words += branchWords.length) > MAX_WORDS) {
					budget.exceeded = true;
					return null;
				}
			}
			return words;
		}
		case "repeat": {
			if (node.min !== node.max || !Number.isFinite(node.max)) return null;
			let words = [[]];
			const childWords = fixedWords(node.child, budget);
			if (!childWords) return null;
			for (let count = 0; count < node.min; count++) {
				const next = [];
				for (const prefix of words) for (const suffix of childWords) {
					if (++budget.words > MAX_WORDS) {
						budget.exceeded = true;
						return null;
					}
					const word = [...prefix, ...suffix];
					budget.symbols += word.length;
					if (budget.symbols > MAX_WORD_SYMBOLS) {
						budget.exceeded = true;
						return null;
					}
					next.push(word);
				}
				words = next;
			}
			return words;
		}
	}
}
function createTrieNode() {
	return {
		terminal: false,
		edges: /* @__PURE__ */ new Map(),
		complexEdges: []
	};
}
function opaqueMatchesLiteral(opaque, literal) {
	if (opaque.kind !== "opaque" || literal.kind !== "literal") return false;
	try {
		return new RegExp(`^(?:${opaque.pattern})$`, opaque.ignoreCase ? "i" : "").test(literal.value);
	} catch {
		return true;
	}
}
function classMatchesLiteral(characterClass, literal) {
	if (characterClass.kind !== "class" || literal.kind !== "literal") return false;
	if (literal.value.charCodeAt(0) <= 127) return characterClass.values.has(literal.key);
	if (characterClass.nonAscii === "all") return true;
	return /\s/.test(literal.value) ? characterClass.nonAscii === "whitespace" : characterClass.nonAscii === "non-whitespace";
}
function nonAsciiDomainsOverlap(left, right) {
	if (left === "none" || right === "none") return false;
	if (left === "all" || right === "all") return true;
	return left === right;
}
function symbolsMayOverlap(left, right) {
	if (left.kind === "literal" && right.kind === "literal") return left.key === right.key;
	if (left.kind === "class" && right.kind === "literal") return classMatchesLiteral(left, right);
	if (left.kind === "literal" && right.kind === "class") return classMatchesLiteral(right, left);
	if (left.kind === "class" && right.kind === "class") {
		const [smaller, larger] = left.values.size <= right.values.size ? [left.values, right.values] : [right.values, left.values];
		for (const value of smaller) if (larger.has(value)) return true;
		return nonAsciiDomainsOverlap(left.nonAscii, right.nonAscii);
	}
	if (left.kind === "opaque" && right.kind === "literal") return opaqueMatchesLiteral(left, right);
	if (left.kind === "literal" && right.kind === "opaque") return opaqueMatchesLiteral(right, left);
	return true;
}
function insertPrefixFreeWord(root, word, comparisons) {
	let node = root;
	for (const symbol of word) {
		if (node.terminal) return false;
		let edge = node.edges.get(symbol.key);
		if (!edge) {
			const candidates = symbol.kind === "literal" ? node.complexEdges : node.edges.values();
			for (const candidate of candidates) {
				if (++comparisons.count > MAX_OPAQUE_COMPARISONS) return false;
				if (symbolsMayOverlap(candidate.symbol, symbol)) return false;
			}
			edge = {
				symbol,
				node: createTrieNode()
			};
			node.edges.set(symbol.key, edge);
			if (symbol.kind !== "literal") node.complexEdges.push(edge);
		}
		node = edge.node;
	}
	if (node.terminal || node.edges.size > 0) return false;
	node.terminal = true;
	return true;
}
function hasPrefixFreeFiniteLanguage(node) {
	const budget = {
		words: 0,
		symbols: 0,
		exceeded: false
	};
	const words = fixedWords(node, budget);
	if (!words) return {
		safe: false,
		budgetExceeded: budget.exceeded,
		wordCount: 0
	};
	const root = createTrieNode();
	const comparisons = { count: 0 };
	for (const word of words) if (!insertPrefixFreeWord(root, word, comparisons)) return {
		safe: false,
		budgetExceeded: comparisons.count > MAX_OPAQUE_COMPARISONS,
		wordCount: words.length
	};
	return {
		safe: true,
		budgetExceeded: false,
		wordCount: words.length
	};
}
function ambiguousExpansionFactor(node) {
	switch (node.kind) {
		case "atom":
		case "assertion": return 1;
		case "alternation": {
			const result = hasPrefixFreeFiniteLanguage(node);
			if (result.safe) return 1;
			if (result.budgetExceeded || result.wordCount === 0) return 257;
			return result.wordCount;
		}
		case "sequence": {
			let factor = 1;
			for (const child of node.children) {
				factor *= ambiguousExpansionFactor(child);
				if (factor > MAX_SEQUENCE_EXPANSIONS) return factor;
			}
			return factor;
		}
		case "repeat": {
			if (node.min !== node.max || !Number.isFinite(node.max)) return 1;
			const childFactor = ambiguousExpansionFactor(node.child);
			let factor = 1;
			for (let count = 0; count < node.max; count++) {
				factor *= childFactor;
				if (factor > MAX_SEQUENCE_EXPANSIONS) return factor;
			}
			return factor;
		}
	}
}
function isNullable(node) {
	switch (node.kind) {
		case "atom": return !node.fixedWidth;
		case "assertion": return true;
		case "sequence": return node.children.every(isNullable);
		case "alternation": return node.branches.some(isNullable);
		case "repeat": return node.min === 0 || isNullable(node.child);
	}
}
function firstSymbols(node) {
	switch (node.kind) {
		case "atom": return node.symbol ? [node.symbol] : null;
		case "assertion": return [];
		case "repeat": return firstSymbols(node.child);
		case "alternation": {
			const symbols = [];
			for (const branch of node.branches) {
				const branchSymbols = firstSymbols(branch);
				if (!branchSymbols) return null;
				symbols.push(...branchSymbols);
			}
			return symbols;
		}
		case "sequence": {
			const symbols = [];
			for (const child of node.children) {
				const childSymbols = firstSymbols(child);
				if (!childSymbols) return null;
				symbols.push(...childSymbols);
				if (!isNullable(child)) break;
			}
			return symbols;
		}
	}
}
function lastSymbols(node) {
	switch (node.kind) {
		case "atom": return node.symbol ? [node.symbol] : null;
		case "assertion": return [];
		case "repeat": return lastSymbols(node.child);
		case "alternation": {
			const symbols = [];
			for (const branch of node.branches) {
				const branchSymbols = lastSymbols(branch);
				if (!branchSymbols) return null;
				symbols.push(...branchSymbols);
			}
			return symbols;
		}
		case "sequence": {
			const symbols = [];
			for (let index = node.children.length - 1; index >= 0; index--) {
				const child = node.children[index];
				const childSymbols = lastSymbols(child);
				if (!childSymbols) return null;
				symbols.push(...childSymbols);
				if (!isNullable(child)) break;
			}
			return symbols;
		}
	}
}
function boundariesMayOverlap(left, right, comparisons) {
	if (!left || !right) return true;
	for (const leftSymbol of left) for (const rightSymbol of right) {
		if (++comparisons.count > MAX_OPAQUE_COMPARISONS) return true;
		if (symbolsMayOverlap(leftSymbol, rightSymbol)) return true;
	}
	return false;
}
function findSequenceIssue(node) {
	if (ambiguousExpansionFactor(node) > MAX_SEQUENCE_EXPANSIONS) return "ambiguous sequence expansion";
	let pendingRepetitionEnds = [];
	const comparisons = { count: 0 };
	let overlappingBoundaryCount = 0;
	for (const child of node.children) if (child.kind === "repeat" && (child.min !== child.max || !Number.isFinite(child.max))) {
		const starts = firstSymbols(child);
		if (pendingRepetitionEnds.filter((ends) => boundariesMayOverlap(ends, starts, comparisons)).length > 0) overlappingBoundaryCount++;
		else if (!isNullable(child)) overlappingBoundaryCount = 0;
		if (overlappingBoundaryCount > MAX_SAFE_OVERLAPPING_VARIABLE_BOUNDARIES) return "overlapping sequential repetition";
		const ends = lastSymbols(child);
		pendingRepetitionEnds = isNullable(child) ? [...pendingRepetitionEnds, ends] : [ends];
	} else if (!isNullable(child)) {
		pendingRepetitionEnds = [];
		overlappingBoundaryCount = 0;
	}
	return null;
}
function findSafetyIssue(node) {
	switch (node.kind) {
		case "atom": return null;
		case "assertion": return findSafetyIssue(node.child);
		case "sequence": {
			const sequenceIssue = findSequenceIssue(node);
			if (sequenceIssue) return sequenceIssue;
			for (const child of node.children) {
				const issue = findSafetyIssue(child);
				if (issue) return issue;
			}
			return null;
		}
		case "alternation":
			for (const branch of node.branches) {
				const issue = findSafetyIssue(branch);
				if (issue) return issue;
			}
			return null;
		case "repeat": {
			const nestedRepetition = containsConsumingRepetition(node.child);
			if (node.max > 1 && nestedRepetition && exactWidth(node.child) === null) return "nested repetition";
			if (node.max > 1 && containsConsumingAlternation(node.child)) {
				const prefixFree = hasPrefixFreeFiniteLanguage(node.child);
				if (!prefixFree.safe) return prefixFree.budgetExceeded ? "analysis budget exceeded" : "ambiguous alternatives under repetition";
			}
			return findSafetyIssue(node.child);
		}
	}
}
function analyzeRegexSafety(pattern, options = {}) {
	if (pattern.length > MAX_PATTERN_LENGTH) return "analysis budget exceeded";
	const parser = new RegexParser(pattern, options.ignoreCase === true);
	const node = parser.parse();
	if (parser.exceededBudget) return "analysis budget exceeded";
	return findSafetyIssue(node);
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/config/request-context.js
function parseCookies(cookieHeader) {
	return parseCookieHeader(cookieHeader);
}
//#endregion
//#region ../../../frontend/node_modules/vinext/dist/config/config-matchers.js
/**
* Cache for compiled regex patterns in matchConfigPattern.
*
* Redirect/rewrite patterns are static — they come from next.config.js and
* never change at runtime. Without caching, every request that hits the regex
* branch re-runs the full tokeniser walk + isSafeRegex + new RegExp() for
* every rule in the array. On apps with many locale-prefixed rules (which all
* contain `(` and therefore enter the regex branch) this dominated profiling
* at ~2.4 seconds of CPU self-time.
*
* Value is `null` when safeRegExp rejected the pattern (ReDoS risk), so we
* skip it on subsequent requests too without re-running the scanner.
*/
var _compiledPatternCache = /* @__PURE__ */ new Map();
/**
* Cache for compiled has/missing condition value regexes in checkSingleCondition.
*
* Each has/missing condition may carry a `value` string that is passed directly
* to safeRegExp() for matching against header/cookie/query/host values. The
* condition objects are static (from next.config.js) so the compiled RegExp
* never changes. Without caching, safeRegExp() is called on every request for
* every condition on every rule.
*
* Value is `null` when safeRegExp rejected the pattern, or `false` when the
* value string was undefined (no regex needed — use exact string comparison).
*/
var _compiledConditionCache = /* @__PURE__ */ new Map();
/**
* Cache for destination substitution regexes in substituteDestinationParams.
*
* The regex depends only on the set of param keys captured from the matched
* source pattern. Caching by sorted key list avoids recompiling a new RegExp
* for repeated redirect/rewrite calls that use the same param shape.
*/
var _compiledDestinationParamCache = /* @__PURE__ */ new Map();
/**
* Generic helper for the regex compilation caches above.
*
* Each cache stores the compiled artifact (or `null` when safeRegExp rejected
* the pattern) the first time a key is seen, and reuses it forever. The
* `undefined` sentinel distinguishes "not yet seen" from "seen and rejected"
* so we never re-run isSafeRegex on the same input.
*
* Keep the security path intact: `compile()` is responsible for calling
* safeRegExp(); this helper only handles caching.
*/
function getCachedRegex(cache, key, compile) {
	let value = cache.get(key);
	if (value === void 0) {
		value = compile();
		cache.set(key, value);
	}
	return value;
}
/**
* Redirect index for O(1) locale-static rule lookup.
*
* Many Next.js apps generate 50-100 redirect rules of the form:
*   /:locale(en|es|fr|...)?/some-static-path  →  /some-destination
*
* The compiled regex for each is like:
*   ^/(en|es|fr|...)?/some-static-path$
*
* When no redirect matches (the common case for ordinary page loads),
* matchRedirect previously ran exec() on every one of those regexes —
* ~2ms per call, ~2992ms total self-time in profiles.
*
* The index splits rules into two buckets:
*
*   localeStatic — rules whose source is exactly /:paramName(alt1|alt2|...)?/suffix
*     where `suffix` is a static path with no further params or regex groups.
*     These are indexed in a Map<suffix, entry[]> for O(1) lookup after a
*     single fast strip of the optional locale prefix.
*
*   linear — all other rules. Matched with the original O(n) loop.
*
* The index is stored in a WeakMap keyed by the redirects array so it is
* computed once per config load and GC'd when the array is no longer live.
*
* ## Ordering invariant
*
* Redirect rules must be evaluated in their original order (first match wins).
* Each locale-static entry stores its `originalIndex` so that, when a
* locale-static fast-path match is found, any linear rules that appear earlier
* in the array are still checked first.
*/
/**
* Matches `/:param(alternation)?/static/suffix` — the locale-static pattern.
*
* The `?` after the capture group is itself optional so that both forms are
* detected:
*   - `/:locale(en|fr)?/foo` (locale segment optional — user-written rules)
*   - `/:nextInternalLocale(en|fr)/foo` (locale segment mandatory — emitted
*      by `applyLocaleToRoutes` for the locale-capture variant)
* Both forms benefit from O(1) suffix lookup; the optionality is recorded
* on the entry so we know whether to try the no-locale-prefix bucket.
*/
var _LOCALE_STATIC_RE = /^\/:[\w-]+\(([^)]+)\)(\??)\/([a-zA-Z0-9_~.%@!$&'*+,;=:/-]+)$/;
var _redirectIndexCache = /* @__PURE__ */ new WeakMap();
/**
* Build (or retrieve from cache) the redirect index for a given redirects array.
*
* Called once per config load from matchRedirect. The WeakMap ensures the index
* is recomputed if the config is reloaded (new array reference) and GC'd when
* the array is collected.
*/
function _getRedirectIndex(redirects) {
	let index = _redirectIndexCache.get(redirects);
	if (index !== void 0) return index;
	const localeStatic = /* @__PURE__ */ new Map();
	const linear = [];
	for (let i = 0; i < redirects.length; i++) {
		const redirect = redirects[i];
		const m = _LOCALE_STATIC_RE.exec(redirect.source);
		if (m) {
			const paramName = redirect.source.slice(2, redirect.source.indexOf("("));
			const alternation = m[1];
			const optional = m[2] === "?";
			const suffix = "/" + m[3];
			const altRe = safeRegExp("^(?:" + alternation + ")$", "i");
			if (!altRe) {
				linear.push([i, redirect]);
				continue;
			}
			const entry = {
				paramName,
				altRe,
				optional,
				redirect,
				originalIndex: i
			};
			const bucketKey = suffix.toLowerCase();
			const bucket = localeStatic.get(bucketKey);
			if (bucket) bucket.push(entry);
			else localeStatic.set(bucketKey, [entry]);
		} else linear.push([i, redirect]);
	}
	index = {
		localeStatic,
		linear
	};
	_redirectIndexCache.set(redirects, index);
	return index;
}
/**
* Detect regex patterns vulnerable to catastrophic backtracking (ReDoS).
*
* Uses the same deterministic structural analysis as middleware matcher
* validation. Nested bounded repetition is accepted only when its repeated
* language has fixed width and unambiguous branches; a fixed outer count can
* otherwise still cause polynomially catastrophic backtracking on long near
* misses.
*
* Returns true if the pattern appears safe, false if it's potentially dangerous.
*/
function isSafeRegex(pattern, flags) {
	return analyzeRegexSafety(pattern, { ignoreCase: flags?.includes("i") }) === null;
}
/**
* Compile a regex pattern safely. Returns the compiled RegExp or null if the
* pattern is invalid or vulnerable to ReDoS.
*
* Logs a warning when a pattern is rejected so developers can fix their config.
*/
function safeRegExp(pattern, flags) {
	if (!isSafeRegex(pattern, flags)) {
		console.warn(`[vinext] Rejecting potentially unsafe regex pattern (ReDoS risk): ${pattern}\n  Nested or ambiguous repetition can cause catastrophic backtracking.\n  Simplify the pattern to make repeated matches fixed and unambiguous.`);
		return null;
	}
	try {
		return new RegExp(pattern, flags);
	} catch {
		return null;
	}
}
var _BASEPATH_DEFAULT = {
	basePath: "",
	hadBasePath: true
};
/**
* Decide whether a rule should be evaluated at all given the current
* basePath-gating state.
*
* Encodes the Next.js rules:
*   - basePath: false rule → only when the request was NOT under basePath
*     (i.e. it's the explicit opt-out path). When `basePath` itself is
*     empty, basePath: false rules are still allowed to match — there's
*     just no basePath to gate them.
*   - default rule (basePath !== false) → only when the request WAS under
*     basePath (or no basePath is configured).
*/
function shouldEvaluateRule(ruleBasePath, state) {
	if (!state.basePath) return true;
	return ruleBasePath === false ? !state.hadBasePath : state.hadBasePath;
}
function _emptyParams() {
	return Object.create(null);
}
function _matchConditionValue(actualValue, expectedValue) {
	if (!expectedValue) return actualValue ? _emptyParams() : null;
	const re = _cachedConditionRegex(expectedValue);
	if (re) {
		const match = re.exec(actualValue);
		if (!match) return null;
		const params = _emptyParams();
		if (match.groups) {
			for (const [key, value] of Object.entries(match.groups)) if (value !== void 0) params[key] = value;
		}
		return params;
	}
	return actualValue === expectedValue ? _emptyParams() : null;
}
/**
* Check a single has/missing condition against request context.
* Returns captured params when the condition is satisfied, or null otherwise.
*/
function matchSingleCondition(condition, ctx) {
	switch (condition.type) {
		case "header": {
			const headerValue = ctx.headers.get(condition.key);
			if (headerValue === null) return null;
			return _matchConditionValue(headerValue, condition.value);
		}
		case "cookie": {
			if (!Object.hasOwn(ctx.cookies, condition.key)) return null;
			const cookieValue = ctx.cookies[condition.key];
			return _matchConditionValue(cookieValue, condition.value);
		}
		case "query": {
			const queryValues = ctx.query.getAll(condition.key);
			if (queryValues.length === 0) return null;
			if (!condition.value && queryValues.length > 1) return _emptyParams();
			return _matchConditionValue(queryValues[queryValues.length - 1], condition.value);
		}
		case "host":
			if (condition.value !== void 0) return _matchConditionValue(ctx.host, condition.value);
			return ctx.host === condition.key ? _emptyParams() : null;
		default: return null;
	}
}
/**
* Return a cached RegExp for a has/missing condition value string, compiling
* on first use. Returns null if safeRegExp rejected the pattern or if the
* value is not a valid regex (fall back to exact string comparison).
*/
function _cachedConditionRegex(value) {
	return getCachedRegex(_compiledConditionCache, value, () => safeRegExp(`^${value}$`));
}
/**
* Check all has/missing conditions for a config rule.
* Returns true if the rule should be applied (all has conditions pass, all missing conditions pass).
*
* - has: every condition must match (the request must have it)
* - missing: every condition must NOT match (the request must not have it)
*/
function collectConditionParams(has, missing, ctx) {
	const params = _emptyParams();
	if (has) for (const condition of has) {
		const conditionParams = matchSingleCondition(condition, ctx);
		if (!conditionParams) return null;
		Object.assign(params, conditionParams);
	}
	if (missing) {
		for (const condition of missing) if (matchSingleCondition(condition, ctx)) return null;
	}
	return params;
}
/**
* If the current position in `str` starts with a parenthesized group, consume
* it and advance `re.lastIndex` past the closing `)`. Returns the group
* contents or null if no group is present.
*/
function extractConstraint(str, re) {
	if (str[re.lastIndex] !== "(") return null;
	const start = re.lastIndex + 1;
	let depth = 1;
	let i = start;
	while (i < str.length && depth > 0) {
		if (str[i] === "(") depth++;
		else if (str[i] === ")") depth--;
		i++;
	}
	if (depth !== 0) return null;
	re.lastIndex = i;
	return str.slice(start, i - 1);
}
/**
* Match a Next.js config pattern (from redirects/rewrites sources) against a pathname.
* Returns matched params or null.
*
* Supports:
*   :param     - matches a single path segment
*   :param*    - matches zero or more segments (catch-all)
*   :param+    - matches one or more segments
*   (regex)    - inline regex patterns in the source
*   :param(constraint) - named param with inline regex constraint
*/
/**
* Strip a single trailing slash from a pathname for config-source matching.
*
* Next.js conditionally appends `(/)?` to rewrite/redirect/header source
* regexes when `trailingSlash: true` (see Next.js
* `resolve-rewrites.ts` and `server-utils.ts:checkRewrite`). Rather than
* threading the trailingSlash flag through every matcher, we unconditionally
* strip a trailing slash from the incoming pathname. When `trailingSlash: false`
* the request pipeline emits a normalizing redirect (step 3) before config
* rewrites/redirects (step 6) ever run, so the pathname is already slash-free;
* the unconditional strip is defense-in-depth for that ordering. When
* `trailingSlash: true` it bridges the gap between the canonicalized request
* path (`/rewrite-1/`) and source patterns written without a trailing slash
* (`/rewrite-1`).
*
* The root path `"/"` is preserved as-is.
*/
function stripTrailingSlashForConfigMatch(value) {
	return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
}
function configPathEquals(a, b) {
	return a.toLowerCase() === b.toLowerCase();
}
function configPathStartsWith(pathname, prefix) {
	return pathname.slice(0, prefix.length).toLowerCase() === prefix.toLowerCase();
}
function matchConfigPattern(pathname, pattern) {
	const pathnameHadTrailingSlash = pathname.length > 1 && pathname.endsWith("/");
	pathname = stripTrailingSlashForConfigMatch(pathname);
	if (pathnameHadTrailingSlash) pattern = stripTrailingSlashForConfigMatch(pattern);
	const catchAllAnchor = /:[\w-]+[*+]/.test(pattern);
	const namedParamCount = (pattern.match(/:[\w-]+/g) || []).length;
	if (pattern.includes("(") || pattern.includes("\\") || /:[\w-]+[*+][^/]/.test(pattern) || /:[\w-]+\./.test(pattern) || /[^/]:[\w-]+/.test(pattern) || catchAllAnchor && namedParamCount > 1) try {
		const compiled = getCachedRegex(_compiledPatternCache, pattern, () => {
			const paramNames = [];
			let regexStr = "";
			const tokenRe = /:([\w-]+)|[.]|[^:.]+/g;
			let tok;
			while ((tok = tokenRe.exec(pattern)) !== null) if (tok[1] !== void 0) {
				const name = tok[1];
				const rest = pattern.slice(tokenRe.lastIndex);
				if (rest.startsWith("*") || rest.startsWith("+")) {
					const quantifier = rest[0];
					tokenRe.lastIndex += 1;
					const constraint = extractConstraint(pattern, tokenRe);
					paramNames.push(name);
					if (constraint !== null) regexStr += `(${constraint})`;
					else regexStr += quantifier === "*" ? "(.*)" : "(.+)";
				} else {
					const constraint = extractConstraint(pattern, tokenRe);
					paramNames.push(name);
					regexStr += constraint !== null ? `(${constraint})` : "([^/]+)";
				}
			} else if (tok[0] === ".") regexStr += "\\.";
			else regexStr += tok[0];
			const re = safeRegExp("^" + regexStr + "$", "i");
			return re ? {
				re,
				paramNames
			} : null;
		});
		if (!compiled) return null;
		const match = compiled.re.exec(pathname);
		if (!match) return null;
		const params = Object.create(null);
		for (let i = 0; i < compiled.paramNames.length; i++) params[compiled.paramNames[i]] = match[i + 1] ?? "";
		return params;
	} catch {}
	const catchAllMatch = pattern.match(/:([\w-]+)(\*|\+)$/);
	if (catchAllMatch) {
		const prefix = pattern.slice(0, pattern.lastIndexOf(":"));
		const paramName = catchAllMatch[1];
		const isPlus = catchAllMatch[2] === "+";
		const prefixNoSlash = prefix.replace(/\/$/, "");
		if (!configPathStartsWith(pathname, prefixNoSlash)) return null;
		const charAfter = pathname[prefixNoSlash.length];
		if (charAfter !== void 0 && charAfter !== "/") return null;
		const rest = pathname.slice(prefixNoSlash.length);
		if (isPlus && (!rest || rest === "/")) return null;
		let restValue = rest.startsWith("/") ? rest.slice(1) : rest;
		return { [paramName]: restValue };
	}
	const parts = pattern.split("/");
	const pathParts = pathname.split("/");
	if (parts.length !== pathParts.length) return null;
	const params = Object.create(null);
	for (let i = 0; i < parts.length; i++) if (parts[i].startsWith(":")) params[parts[i].slice(1)] = pathParts[i];
	else if (!configPathEquals(parts[i], pathParts[i])) return null;
	return params;
}
/**
* Apply redirect rules from next.config.js.
* Returns the redirect info if a redirect was matched, or null.
*
* `ctx` provides the request context (cookies, headers, query, host) used
* to evaluate has/missing conditions. Next.js always has request context
* when evaluating redirects, so this parameter is required.
*
* ## Performance
*
* Rules with a locale-capture-group prefix (the dominant pattern in large
* Next.js apps — e.g. `/:locale(en|es|fr|...)?/some-path`) are handled via
* a pre-built index. Instead of running exec() on each locale regex
* individually, we:
*
*   1. Strip the optional locale prefix from the pathname with one cheap
*      string-slice check (no regex exec on the hot path).
*   2. Look up the stripped suffix in a Map<suffix, entry[]>.
*   3. For each matching entry, validate the captured locale string against
*      a small, anchored alternation regex.
*
* This reduces the per-request cost from O(n × regex) to O(1) map lookup +
* O(matches × tiny-regex), eliminating the ~2992ms self-time reported in
* profiles for apps with 63+ locale-prefixed rules.
*
* Rules that don't fit the locale-static pattern fall back to the original
* linear matchConfigPattern scan.
*
* ## Ordering invariant
*
* First match wins, preserving the original redirect array order. When a
* locale-static fast-path match is found at position N, all linear rules with
* an original index < N are checked via matchConfigPattern first — they are
* few in practice (typically zero) so this is not a hot-path concern.
*/
function matchRedirect(pathname, redirects, ctx, basePathState = _BASEPATH_DEFAULT) {
	if (redirects.length === 0) return null;
	const normalizedPathname = stripTrailingSlashForConfigMatch(pathname);
	const index = _getRedirectIndex(redirects);
	let localeMatch = null;
	let localeMatchIndex = Infinity;
	if (index.localeStatic.size > 0) {
		const noLocaleBucket = index.localeStatic.get(normalizedPathname.toLowerCase());
		if (noLocaleBucket) for (const entry of noLocaleBucket) {
			if (!entry.optional) continue;
			if (entry.originalIndex >= localeMatchIndex) continue;
			const redirect = entry.redirect;
			if (!shouldEvaluateRule(redirect.basePath, basePathState)) continue;
			const conditionParams = redirect.has || redirect.missing ? collectConditionParams(redirect.has, redirect.missing, ctx) : _emptyParams();
			if (!conditionParams) continue;
			localeMatch = {
				destination: substituteAndSanitizeDestination(redirect.destination, {
					[entry.paramName]: "",
					...conditionParams
				}),
				permanent: redirect.permanent
			};
			localeMatchIndex = entry.originalIndex;
			break;
		}
		const slashTwo = normalizedPathname.indexOf("/", 1);
		if (slashTwo !== -1) {
			const suffix = normalizedPathname.slice(slashTwo);
			const localePart = normalizedPathname.slice(1, slashTwo);
			const localeBucket = index.localeStatic.get(suffix.toLowerCase());
			if (localeBucket) for (const entry of localeBucket) {
				if (entry.originalIndex >= localeMatchIndex) continue;
				if (!entry.altRe.test(localePart)) continue;
				const redirect = entry.redirect;
				if (!shouldEvaluateRule(redirect.basePath, basePathState)) continue;
				const conditionParams = redirect.has || redirect.missing ? collectConditionParams(redirect.has, redirect.missing, ctx) : _emptyParams();
				if (!conditionParams) continue;
				localeMatch = {
					destination: substituteAndSanitizeDestination(redirect.destination, {
						[entry.paramName]: localePart,
						...conditionParams
					}),
					permanent: redirect.permanent
				};
				localeMatchIndex = entry.originalIndex;
				break;
			}
		}
	}
	for (const [origIdx, redirect] of index.linear) {
		if (origIdx >= localeMatchIndex) break;
		if (!shouldEvaluateRule(redirect.basePath, basePathState)) continue;
		const params = matchConfigPattern(pathname, redirect.source);
		if (params) {
			const conditionParams = redirect.has || redirect.missing ? collectConditionParams(redirect.has, redirect.missing, ctx) : _emptyParams();
			if (!conditionParams) continue;
			return {
				destination: substituteAndSanitizeDestination(redirect.destination, {
					...params,
					...conditionParams
				}),
				permanent: redirect.permanent
			};
		}
	}
	return localeMatch;
}
/**
* Apply rewrite rules from next.config.js.
* Returns the rewritten URL or null if no rewrite matched.
*
* `ctx` provides the request context (cookies, headers, query, host) used
* to evaluate has/missing conditions. Next.js always has request context
* when evaluating rewrites, so this parameter is required.
*/
function matchRewrite(pathname, rewrites, ctx, basePathState = _BASEPATH_DEFAULT, paramsPathname = pathname) {
	for (const rewrite of rewrites) {
		if (!shouldEvaluateRule(rewrite.basePath, basePathState)) continue;
		const matchedParams = matchConfigPattern(pathname, rewrite.source);
		if (matchedParams) {
			const params = paramsPathname === pathname ? matchedParams : matchConfigPattern(paramsPathname, rewrite.source) ?? matchedParams;
			const conditionParams = rewrite.has || rewrite.missing ? collectConditionParams(rewrite.has, rewrite.missing, ctx) : _emptyParams();
			if (!conditionParams) continue;
			const rewriteParams = {
				...params,
				...conditionParams
			};
			return substituteAndSanitizeRewriteDestination(rewrite.destination, rewriteParams);
		}
	}
	return null;
}
/**
* Substitute all matched route params into a redirect/rewrite destination.
*
* Handles repeated params (e.g. `/api/:id/:id`) and catch-all suffix forms
* (`:path*`, `:path+`) in a single pass. Unknown params are left intact.
*/
function substituteDestinationParams(destination, params) {
	const keys = Object.keys(params);
	if (keys.length === 0) return destination;
	const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
	const cacheKey = sortedKeys.join("\0");
	let paramRe = _compiledDestinationParamCache.get(cacheKey);
	if (!paramRe) {
		const paramAlternation = sortedKeys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
		paramRe = new RegExp(`:(${paramAlternation})([+*])?(?![A-Za-z0-9_])`, "g");
		_compiledDestinationParamCache.set(cacheKey, paramRe);
	}
	const replaceParams = (value, encodeParam) => value.replace(paramRe, (_token, key) => encodeParam(params[key]));
	const hashIndex = destination.indexOf("#");
	const beforeHash = hashIndex === -1 ? destination : destination.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : destination.slice(hashIndex);
	const queryIndex = beforeHash.indexOf("?");
	if (queryIndex !== -1) {
		const beforeQuery = beforeHash.slice(0, queryIndex);
		const query = beforeHash.slice(queryIndex + 1);
		return `${replaceParams(beforeQuery, (value) => value)}?${replaceParams(query, encodeDestinationQueryParamValue)}${replaceParams(hash, (value) => value)}`;
	}
	return replaceParams(destination, (value) => value);
}
function encodeDestinationQueryParamValue(value) {
	const params = new URLSearchParams();
	params.set("", value);
	return params.toString().slice(1);
}
/**
* Substitute params into a redirect/rewrite destination and sanitize the
* result. Used by every redirect/rewrite branch — the substitution can
* introduce protocol-relative URLs (e.g. `//evil.com` from a decoded `%2F`
* in a catch-all param), which sanitizeDestination collapses.
*/
function substituteAndSanitizeDestination(destination, params) {
	return sanitizeDestination(substituteDestinationParams(destination, params));
}
/**
* Match Next.js's rewrite-specific prepareDestination behavior: source params
* that are not consumed by the destination path/host are exposed to the target
* page through query.
*
* https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/router/utils/prepare-destination.ts
*/
function substituteAndSanitizeRewriteDestination(destination, params) {
	const rewritten = substituteAndSanitizeDestination(destination, params);
	if (!shouldAppendRewriteParamsToQuery(destination, params)) return rewritten;
	const existingQueryKeys = getDestinationQueryKeys(destination);
	const paramsToAppend = [];
	for (const [key, value] of Object.entries(params)) {
		if (key === "nextInternalLocale" || existingQueryKeys.has(key)) continue;
		paramsToAppend.push([key, value]);
	}
	if (paramsToAppend.length === 0) return rewritten;
	return appendQueryParams(rewritten, paramsToAppend);
}
function shouldAppendRewriteParamsToQuery(destination, params) {
	const keys = Object.keys(params).filter((key) => key !== "nextInternalLocale");
	if (keys.length === 0) return false;
	return !destinationPathOrHostUsesParam(destination, keys);
}
function destinationPathOrHostUsesParam(destination, keys) {
	const pathAndHost = getDestinationPathAndHost(destination);
	if (!pathAndHost) return false;
	for (const key of keys) {
		const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		if (new RegExp(`:${escapedKey}([+*])?(?![A-Za-z0-9_])`).test(pathAndHost)) return true;
	}
	return false;
}
function getDestinationPathAndHost(destination) {
	const hashIndex = destination.indexOf("#");
	const beforeHash = hashIndex === -1 ? destination : destination.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : destination.slice(hashIndex);
	const queryIndex = beforeHash.indexOf("?");
	const beforeQuery = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
	const schemeMatch = /^[a-z][a-z0-9+.-]*:\/\//i.exec(beforeQuery);
	if (!schemeMatch) return `${beforeQuery}${hash}`;
	const withoutScheme = beforeQuery.slice(schemeMatch[0].length);
	const slashIndex = withoutScheme.indexOf("/");
	if (slashIndex === -1) return `${withoutScheme}${hash}`;
	return `${withoutScheme.slice(0, slashIndex)}${withoutScheme.slice(slashIndex)}${hash}`;
}
function getDestinationQueryKeys(destination) {
	const hashIndex = destination.indexOf("#");
	const beforeHash = hashIndex === -1 ? destination : destination.slice(0, hashIndex);
	const queryIndex = beforeHash.indexOf("?");
	if (queryIndex === -1) return /* @__PURE__ */ new Set();
	const query = beforeHash.slice(queryIndex + 1);
	return new Set(new URLSearchParams(query).keys());
}
function appendQueryParams(url, params) {
	const hashIndex = url.indexOf("#");
	const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
	const queryIndex = beforeHash.indexOf("?");
	const base = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
	const query = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);
	const merged = new URLSearchParams(query);
	for (const [key, value] of params) merged.append(key, value);
	const search = merged.toString();
	return `${base}${search ? `?${search}` : ""}${hash}`;
}
/**
* Sanitize a redirect/rewrite destination to collapse protocol-relative URLs.
*
* After parameter substitution, a destination like `/:path*` can become
* `//evil.com` if the catch-all captured a decoded `%2F` (`/evil.com`).
* Browsers interpret `//evil.com` as a protocol-relative URL, redirecting
* users off-site.
*
* This function collapses any leading double (or more) slashes to a single
* slash for non-external (relative) destinations.
*/
function sanitizeDestination(dest) {
	if (dest.startsWith("http://") || dest.startsWith("https://")) return dest;
	dest = dest.replace(/^[\\/]+/, "/");
	return dest;
}
/**
* Check if a URL is external (absolute URL or protocol-relative).
* Detects any URL scheme (http:, https:, data:, javascript:, blob:, etc.)
* per RFC 3986, plus protocol-relative URLs (//).
*/
/**
* Merge the original request's query params into a config-redirect
* destination, preserving them on the resulting `Location`.
*
* Next.js carries the original request query across config redirects
* (`prepareDestination({ query: parsedUrl.query })` →
* `stringifyQuery(...)` in resolve-routes.ts). This matters for App Router
* RSC client navigations: the cache-busting `_rsc` query must survive the
* redirect so the browser's auto-followed request to the destination is
* still treated as an RSC fetch. Dropping it breaks RSC fetch semantics
* (issue #1529).
*
* Destination query params win — a request param is only carried over when
* the destination does not already specify that key. Mirrors the merge
* semantics in `proxyExternalRequest`. External destinations are returned
* untouched (a config redirect to another origin should not leak the
* original request's query).
*/
function preserveRedirectDestinationQuery(destination, requestSearch) {
	if (requestSearch === "" || requestSearch === "?" || isExternalUrl(destination)) return destination;
	const requestParams = new URLSearchParams(requestSearch);
	if ([...requestParams.keys()].length === 0) return destination;
	const hashIndex = destination.indexOf("#");
	const hash = hashIndex === -1 ? "" : destination.slice(hashIndex);
	const beforeHash = hashIndex === -1 ? destination : destination.slice(0, hashIndex);
	const queryIndex = beforeHash.indexOf("?");
	const pathPart = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
	const destQuery = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);
	const merged = new URLSearchParams(destQuery);
	const destKeys = new Set(merged.keys());
	for (const [key, value] of requestParams) if (!destKeys.has(key)) merged.append(key, value);
	const mergedQuery = merged.toString();
	return mergedQuery === "" ? `${pathPart}${hash}` : `${pathPart}?${mergedQuery}${hash}`;
}
//#endregion
export { matchRedirect, matchRewrite, preserveRedirectDestinationQuery, parseCookies as t };

//# sourceMappingURL=config-matchers-1Cd9WJC_.js.map
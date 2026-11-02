// Breaks over-long lines into readable multi-line code WITHOUT changing meaning.
// It only rewrites nodes that contain a line longer than MAX and leaves everything else byte for byte as it was.
//   node expand.cjs <file...>        rewrites the files (a copy is kept next to the script's backup, see caller)
//   node expand.cjs --check <file>   prints stats only
const fs = require("fs");
const path = require("path");
const FRONTEND = "E:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend";
const ts = require(path.join(FRONTEND, "node_modules/typescript"));
const MAX = 140;
const K = ts.SyntaxKind;

function formatFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const text = n => source.slice(n.getStart(sf), n.end);
  const lineIndentAt = pos => { const ls = source.lastIndexOf("\n", pos - 1) + 1; return /^ */.exec(source.slice(ls))[0].length; };
  const pad = n => " ".repeat(n);
  const hasLongLine = s => s.split("\n").some(l => l.length > MAX);
  const hasComment = node => {
    let found = false;
    (function walk(n) {
      if (found) return;
      for (const c of n.getChildren(sf)) {
        const ranges = ts.getLeadingCommentRanges(source, c.pos) || [];
        if (ranges.some(r => r.pos >= node.getStart(sf) && r.end <= node.end)) { found = true; return; }
        walk(c);
      }
    })(node);
    return found;
  };
  /** Original text of a node, moved so its first line sits at `indent` (continuation lines keep their relative indentation). */
  function verbatim(node, indent) {
    const s = text(node), delta = indent - lineIndentAt(node.getStart(sf));
    if (delta === 0 || !s.includes("\n")) return s;
    return s.split("\n").map((l, i) => i === 0 || !l.trim() ? l : delta > 0 ? pad(delta) + l : l.slice(Math.min(-delta, /^ */.exec(l)[0].length))).join("\n");
  }
  const isJsx = n => n && (n.kind === K.JsxElement || n.kind === K.JsxSelfClosingElement || n.kind === K.JsxFragment);
  const unwrap = n => { while (n && n.kind === K.ParenthesizedExpression) n = n.expression; return n; };

  // ---------- JSX ----------
  function attrsOf(opening) { return opening.attributes.properties; }
  function renderAttr(attr, indent) {
    if (attr.kind === K.JsxSpreadAttribute) return verbatim(attr, indent);
    const init = attr.initializer;
    if (!init || init.kind !== K.JsxExpression || !init.expression || hasComment(attr)) return verbatim(attr, indent);
    const inner = renderExpr(init.expression, indent);
    return `${attr.name.getText(sf)}={${inner}}`;
  }
  function renderOpening(opening, indent, selfClosing) {
    const whole = text(opening);
    const attrs = attrsOf(opening);
    if (!hasLongLine(whole) || !attrs.length || hasComment(opening)) return verbatim(opening, indent);
    const tag = (opening.tagName.getText(sf)) + (opening.typeArguments ? text(opening.typeArguments) : "");
    return `<${tag}\n${attrs.map(a => pad(indent + 2) + renderAttr(a, indent + 2)).join("\n")}\n${pad(indent)}${selfClosing ? "/>" : ">"}`;
  }
  const raw = c => source.slice(c.pos, c.end);
  function childrenExpandable(children) {
    // Ignorable: empty text, or whitespace that contains a line break (JSX drops it). A lone space between siblings is meaningful.
    const bad = children.find(c => c.kind === K.JsxText && raw(c) !== "" && !(raw(c).trim() === "" && raw(c).includes("\n")));
    if (bad && process.env.EXPAND_DEBUG) console.log("children not expandable because of text:", JSON.stringify(bad.getText(sf).slice(0, 50)));
    return !bad;
  }
  function renderJsx(node, indent) {
    if (process.env.EXPAND_DEBUG && hasLongLine(text(node)) && hasComment(node)) console.log("JSX has comment:", text(node).slice(0, 70).replace(/\s+/g, " "));
    if (!hasLongLine(text(node)) || hasComment(node)) return verbatim(node, indent);
    if (node.kind === K.JsxSelfClosingElement) return renderOpening(node, indent, true);
    if (node.kind === K.JsxFragment) {
      const kids = node.children.filter(c => !(c.kind === K.JsxText && raw(c).trim() === ""));
      if (!childrenExpandable(node.children)) return verbatim(node, indent);
      return `<>\n${kids.map(c => pad(indent + 2) + renderJsxChild(c, indent + 2)).join("\n")}\n${pad(indent)}</>`;
    }
    const opening = renderOpening(node.openingElement, indent, false);
    const closing = `</${node.closingElement.tagName.getText(sf)}>`;
    if (!childrenExpandable(node.children)) {
      // text that matters: only the opening tag may be broken
      const innerStart = node.openingElement.end, innerEnd = node.closingElement.getStart(sf);
      const inner = source.slice(innerStart, innerEnd);
      const delta = indent - lineIndentAt(node.getStart(sf));
      const shifted = delta && inner.includes("\n") ? inner.split("\n").map((l, i) => i === 0 || !l.trim() ? l : delta > 0 ? pad(delta) + l : l.slice(Math.min(-delta, /^ */.exec(l)[0].length))).join("\n") : inner;
      return opening + shifted + closing;
    }
    const kids = node.children.filter(c => !(c.kind === K.JsxText && raw(c).trim() === ""));
    if (!kids.length) return opening + closing;
    return `${opening}\n${kids.map(c => pad(indent + 2) + renderJsxChild(c, indent + 2)).join("\n")}\n${pad(indent)}${closing}`;
  }
  function renderJsxChild(c, indent) {
    if (isJsx(c)) return renderJsx(c, indent);
    if (c.kind === K.JsxExpression && c.expression && !hasComment(c)) return `{${renderExpr(c.expression, indent, true)}}`;
    return verbatim(c, indent);
  }

  // ---------- expressions ----------
  /** inJsx: the expression sits in {...} between JSX siblings, so JSX operands are wrapped in parentheses on their own lines. */
  function renderExpr(expr, indent, inJsx = false) {
    const s = text(expr);
    if (process.env.EXPAND_DEBUG && hasLongLine(s) && hasComment(expr)) console.log("expr has comment:", s.slice(0, 70).replace(/\s+/g, " "));
    if (!hasLongLine(s) || hasComment(expr)) return verbatim(expr, indent);
    const e = expr;
    if (isJsx(e)) return renderJsx(e, indent);
    if (e.kind === K.ParenthesizedExpression && isJsx(unwrap(e))) return `(\n${pad(indent + 2)}${renderJsx(unwrap(e), indent + 2)}\n${pad(indent)})`;
    if (e.kind === K.BinaryExpression && e.operatorToken.kind === K.AmpersandAmpersandToken && isJsx(unwrap(e.right))) {
      return `${renderExpr(e.left, indent)} && (\n${pad(indent + 2)}${renderJsx(unwrap(e.right), indent + 2)}\n${pad(indent)})`;
    }
    if (e.kind === K.ConditionalExpression && (isJsx(unwrap(e.whenTrue)) || isJsx(unwrap(e.whenFalse)))) {
      const branch = b => isJsx(unwrap(b)) ? `(\n${pad(indent + 2)}${renderJsx(unwrap(b), indent + 2)}\n${pad(indent)})` : renderExpr(b, indent);
      return `${renderExpr(e.condition, indent)} ? ${branch(e.whenTrue)} : ${branch(e.whenFalse)}`;
    }
    if (e.kind === K.ArrowFunction || e.kind === K.FunctionExpression) return renderFunction(e, indent);
    if (e.kind === K.CallExpression && e.arguments.length === 1 && (e.arguments[0].kind === K.ArrowFunction || e.arguments[0].kind === K.FunctionExpression)) {
      const head = text(e).slice(0, e.arguments[0].getStart(sf) - e.getStart(sf));
      return `${head}${renderFunction(e.arguments[0], indent)})`;
    }
    if (e.kind === K.ObjectLiteralExpression && e.properties.length > 1) {
      const props = e.properties.map(p => {
        if (p.kind === K.PropertyAssignment && !hasComment(p)) return pad(indent + 2) + source.slice(p.getStart(sf), p.initializer.getStart(sf)) + renderExpr(p.initializer, indent + 2);
        return pad(indent + 2) + verbatim(p, indent + 2);
      });
      return `{\n${props.join(",\n")}\n${pad(indent)}}`;
    }
    if (e.kind === K.ArrayLiteralExpression && e.elements.length > 1) {
      return `[\n${e.elements.map(x => pad(indent + 2) + renderExpr(x, indent + 2)).join(",\n")}\n${pad(indent)}]`;
    }
    if (e.kind === K.CallExpression && e.arguments.length >= 1 && e.arguments.reduce((n, x) => n + x.end - x.getStart(sf), 0) >= 90) {
      const head = source.slice(e.getStart(sf), e.arguments[0].getStart(sf));
      return `${head}\n${e.arguments.map(x => pad(indent + 2) + renderExpr(x, indent + 2)).join(",\n")}\n${pad(indent)})`;
    }
    if (e.kind === K.ConditionalExpression) {
      return `${renderExpr(e.condition, indent)}\n${pad(indent + 2)}? ${renderExpr(e.whenTrue, indent + 2)}\n${pad(indent + 2)}: ${renderExpr(e.whenFalse, indent + 2)}`;
    }
    if (e.kind === K.BinaryExpression && [K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken].includes(e.operatorToken.kind)) {
      const operands = []; let cur = e;
      while (cur.kind === K.BinaryExpression && cur.operatorToken.kind === e.operatorToken.kind) { operands.unshift(cur.right); cur = cur.left; }
      operands.unshift(cur);
      const op = e.operatorToken.getText(sf);
      return operands.map((x, i) => (i ? pad(indent + 2) : "") + renderExpr(x, indent + (i ? 2 : 0))).join(` ${op}\n`);
    }
    if (e.kind === K.BinaryExpression && e.operatorToken.kind === K.EqualsToken) return `${text(e.left)} = ${renderExpr(e.right, indent)}`;
    if (e.kind === K.AwaitExpression) return `await ${renderExpr(e.expression, indent)}`;
    return verbatim(expr, indent);
  }
  function renderFunction(fn, indent) {
    const params = text(fn).slice(0, fn.body.getStart(sf) - fn.getStart(sf));
    if (hasComment(fn)) return verbatim(fn, indent);
    if (fn.body.kind === K.Block) return `${params}${renderBlock(fn.body, indent)}`;
    const body = unwrap(fn.body);
    if (isJsx(body)) return `${params}(\n${pad(indent + 2)}${renderJsx(body, indent + 2)}\n${pad(indent)})`;
    return `${params}${renderExpr(fn.body, indent)}`;
  }

  // ---------- statements ----------
  function renderBlock(block, indent) {
    if (!block.statements.length || hasComment(block)) return verbatim(block, indent);
    return `{\n${block.statements.map(st => pad(indent + 2) + renderStatement(st, indent + 2)).join("\n")}\n${pad(indent)}}`;
  }
  function renderStatement(st, indent) {
    const s = text(st);
    const longOrCrowded = hasLongLine(s);
    if (!longOrCrowded || hasComment(st)) return verbatim(st, indent);
    switch (st.kind) {
      case K.Block: return renderBlock(st, indent);
      case K.VariableStatement: {
        const list = st.declarationList, kw = list.flags & ts.NodeFlags.Const ? "const" : list.flags & ts.NodeFlags.Let ? "let" : "var";
        const mods = st.modifiers ? st.modifiers.map(m => m.getText(sf)).join(" ") + " " : "";
        return list.declarations.map(d => {
          const init = d.initializer;
          const head = source.slice(d.getStart(sf), init ? init.getStart(sf) : d.end);
          return `${mods}${kw} ${head}${init ? renderExpr(init, indent) : ""};`;
        }).join(`\n${pad(indent)}`);
      }
      case K.ReturnStatement: {
        if (!st.expression) return verbatim(st, indent);
        const ex = unwrap(st.expression);
        if (isJsx(ex)) return `return (\n${pad(indent + 2)}${renderJsx(ex, indent + 2)}\n${pad(indent)});`;
        return `return ${renderExpr(st.expression, indent)};`;
      }
      case K.ExpressionStatement: return `${renderExpr(st.expression, indent)};`;
      case K.IfStatement: {
        const head = `if (${text(st.expression)})`;
        const thenPart = st.thenStatement.kind === K.Block ? ` ${renderBlock(st.thenStatement, indent)}` : `
${pad(indent + 2)}${renderStatement(st.thenStatement, indent + 2)}`;
        const el = st.elseStatement;
        const elsePart = !el ? "" : el.kind === K.IfStatement ? ` else ${renderStatement(el, indent)}` : el.kind === K.Block ? ` else ${renderBlock(el, indent)}` : `
${pad(indent)}else
${pad(indent + 2)}${renderStatement(el, indent + 2)}`;
        return head + thenPart + elsePart;
      }
      case K.TryStatement: {
        let out = `try ${renderBlock(st.tryBlock, indent)}`;
        if (st.catchClause) { const decl = st.catchClause.variableDeclaration ? ` (${text(st.catchClause.variableDeclaration)})` : ""; out += ` catch${decl} ${renderBlock(st.catchClause.block, indent)}`; }
        if (st.finallyBlock) out += ` finally ${renderBlock(st.finallyBlock, indent)}`;
        return out;
      }
      case K.FunctionDeclaration: {
        if (!st.body) return verbatim(st, indent);
        const head = source.slice(st.getStart(sf), st.body.getStart(sf));
        return `${head}${renderBlock(st.body, indent)}`;
      }
      case K.InterfaceDeclaration: {
        const head = source.slice(st.getStart(sf), st.members.pos - 0).replace(/\{\s*$/, "").trimEnd();
        return `${head} {\n${st.members.map(m => pad(indent + 2) + text(m).replace(/[;,]$/, "") + ";").join("\n")}\n${pad(indent)}}`;
      }
      case K.ImportDeclaration: {
        const clause = st.importClause;
        if (!clause || !clause.namedBindings || clause.namedBindings.kind !== K.NamedImports) return verbatim(st, indent);
        const lead = (clause.isTypeOnly ? "import type " : "import ") + (clause.name ? clause.name.getText(sf) + ", " : "");
        return `${lead}{\n${clause.namedBindings.elements.map(x => pad(indent + 2) + x.getText(sf)).join(",\n")}\n${pad(indent)}} from ${st.moduleSpecifier.getText(sf)};`;
      }
      default: return verbatim(st, indent);
    }
  }

  // ---------- driver: rewrite top-level statements, descending into function bodies ----------
  const edits = [];
  function visitStatements(list) {
    for (const st of list) {
      if (!hasLongLine(text(st))) continue;
      if (st.kind === K.FunctionDeclaration && st.body) { visitStatements(st.body.statements); continue; }
      if (hasComment(st)) { if (process.env.EXPAND_DEBUG) console.log("statement skipped (comment inside):", ts.SyntaxKind[st.kind], text(st).slice(0, 60).replace(/\s+/g, " ")); continue; }
      edits.push([st.getStart(sf), st.end, renderStatement(st, lineIndentAt(st.getStart(sf)))]);
    }
  }
  visitStatements(sf.statements);
  let out = source;
  for (const [a, b, rep] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + rep + out.slice(b);
  return { source, out };
}

/** Emit comparison: the compiled JS (whitespace and parentheses removed) must be identical before and after. */
function emit(code, file) {
  const r = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, removeComments: true }, fileName: file, reportDiagnostics: true });
  // `const a = 1, b = 2` and two separate consts mean the same, so declaration keywords and commas are ignored too
  return { js: r.outputText.replace(/\b(const|let|var)\b/g, "").replace(/\s+/g, "").replace(/[(),;]/g, ""), diagnostics: (r.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error) };
}
module.exports = { formatFile, emit };

if (require.main === module) {
  const args = process.argv.slice(2), check = args[0] === "--check", files = check ? args.slice(1) : args;
  let bad = 0;
  for (const f of files) {
    const { source, out } = formatFile(f);
    const a = emit(source, f), b = emit(out, f);
    const longBefore = source.split("\n").filter(l => l.length > MAX).length, longAfter = out.split("\n").filter(l => l.length > MAX).length;
    const same = a.js === b.js && b.diagnostics.length === 0;
    console.log(`${same ? "ok  " : "FAIL"} ${path.basename(f).padEnd(30)} lines ${source.split("\n").length} -> ${out.split("\n").length}   long lines ${longBefore} -> ${longAfter}${same ? "" : "   (emit differs or syntax error)"}`);
    if (!same) { bad++; continue; }
    if (!check && out !== source) {
      const raw = fs.readFileSync(f, "utf8"), crlfCount = raw.split("\r\n").length - 1, lfCount = raw.split("\n").length - 1 - crlfCount;
      fs.writeFileSync(f, crlfCount > lfCount ? out.split("\n").join("\r\n") : out);
    }
  }
  process.exit(bad ? 1 : 0);
}

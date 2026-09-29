'use strict';

// Kleiner, sicherer Taschenrechner für die Suche (ohne eval).
// Unterstützt + - * / ^ %, Klammern, Dezimalkomma und "x" bzw. "×" als Mal.

(function (root) {
  function tokenize(input) {
    const s = input.replace(/×|x/gi, '*').replace(/÷|:/g, '/').replace(/,/g, '.').replace(/\s+/g, '');
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const numStr = s.slice(i, j);
        if ((numStr.match(/\./g) || []).length > 1) return null;
        tokens.push({ t: 'n', v: parseFloat(numStr) });
        i = j;
      } else if ('+-*/^%()'.includes(c)) {
        tokens.push({ t: c });
        i++;
      } else {
        return null;
      }
    }
    return tokens;
  }

  // Rekursiver Abstieg: expr = term (+|- term)*, term = factor (*|/ factor)*, factor = unary (^ factor)?
  function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    function primary() {
      const tk = next();
      if (!tk) throw new Error('end');
      if (tk.t === 'n') {
        let v = tk.v;
        if (peek() && peek().t === '%') { next(); v /= 100; }
        return v;
      }
      if (tk.t === '(') {
        const v = expr();
        if (!peek() || peek().t !== ')') throw new Error('paren');
        next();
        return v;
      }
      throw new Error('token');
    }
    function unary() {
      if (peek() && (peek().t === '-' || peek().t === '+')) {
        const op = next().t;
        const v = unary();
        return op === '-' ? -v : v;
      }
      return primary();
    }
    function power() {
      const base = unary();
      if (peek() && peek().t === '^') { next(); return Math.pow(base, power()); }
      return base;
    }
    function term() {
      let v = power();
      while (peek() && (peek().t === '*' || peek().t === '/')) {
        const op = next().t;
        const r = power();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    }
    function expr() {
      let v = term();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        const op = next().t;
        const r = term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    const v = expr();
    if (pos !== tokens.length) throw new Error('rest');
    return v;
  }

  // Liefert das Ergebnis oder null, wenn die Eingabe keine Rechnung ist
  function calculate(input) {
    if (typeof input !== 'string') return null;
    const s = input.trim().replace(/=$/, '');
    // Mindestens ein Operator und eine Zahl, sonst ist es wohl eine normale Suche
    if (!/\d/.test(s) || !/[+\-*/^%×÷x:]/i.test(s.replace(/^-/, ''))) return null;
    if (/[a-wyz]/i.test(s)) return null;
    const tokens = tokenize(s);
    if (!tokens || !tokens.length) return null;
    try {
      const v = parse(tokens);
      if (!Number.isFinite(v)) return null;
      return Math.round(v * 1e10) / 1e10;
    } catch {
      return null;
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { calculate };
  else root.CockpitCalc = { calculate };
})(typeof window !== 'undefined' ? window : globalThis);

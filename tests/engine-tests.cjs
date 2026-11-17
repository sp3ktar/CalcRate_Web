'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'index.html'), 'utf8'
);
const start = html.indexOf('/* ================= ENGINE ================= */');
const end = html.indexOf('/* ================= STATE ================= */');
assert(start >= 0 && end > start, 'Не найден блок движка');

const sandbox = {
  T: (key, args) => String(key).replace(
    /\{(\d)\}/g, (match, index) => args ? args[+index] : match
  )
};
vm.createContext(sandbox);
vm.runInContext(html.slice(start, end), sandbox, { timeout: 3000 });

function calc(expression) {
  return vm.runInContext(
    'evaluate(' + JSON.stringify(expression) +
    ', {angle:"deg",vars:{},ans:null,fns:{},fnNames:{}})',
    sandbox, { timeout: 1500 }
  );
}
function near(actual, expected, epsilon = 1e-12) {
  assert(Math.abs(actual - expected) <= epsilon,
    `${actual} != ${expected}`);
}
assert.equal(calc('2+3×4'), 14);
assert.equal(calc('2^3^2'), 512);
assert.equal(calc('-2^2'), -4);
assert.equal(calc('5×-3'), -15);
assert.equal(calc('200+10%'), 220);
assert.equal(calc('round(-2.5)'), -3);
assert.equal(calc('gcd(12,18)'), 6);
assert.equal(calc('∑(i,i,1,3)'), 6);
assert.equal(calc('ncr(200,2)'), 19900);
assert.equal(calc('npr(200,2)'), 39800);
near(calc('0.5!'), 0.886226925452758);

assert.throws(
  () => calc('∑(i,i,1E20,1E20)'),
  error => error && error.message === 'Слишком много шагов'
);

assert.equal(sandbox.normalizePaste('.5'), '0.5');
assert.equal(sandbox.normalizePaste('−.5'), '-0.5');
assert.equal(sandbox.normalizePaste('0,001'), '0.001');
assert.equal(sandbox.normalizePaste('1,500'), '1500');
assert.equal(sandbox.normalizePaste('1.2.3'), null);
assert.equal(sandbox.normalizePaste('1,2,3'), null);
assert.equal(sandbox.normalizePaste('99 999,01'), '99999.01');
assert.equal(sandbox.normalizePaste('$43,100.5'), '43100.5');
assert.equal(sandbox.preparePaste('1e-3'), '1E-3');

function shown(number) {
  return sandbox.fmtNum(number, 2, 'dec', '', 6);
}
assert.equal(shown(362.885), '362.89');
assert.equal(shown(1234.56789), '1234.57');
assert.equal(shown(0.0023666), '0.002367');
assert.equal(shown(0.000023456), '0.000023');
assert.equal(shown(12.0034), '12.0034');
assert.equal(shown(0.000000235), '2.35E−7');

const encoded = JSON.stringify(
  { positive: Infinity, negative: -Infinity, invalid: NaN },
  sandbox.calcrateNumberReplacer
);
const decoded = JSON.parse(encoded, sandbox.calcrateNumberReviver);
assert.equal(decoded.positive, Infinity);
assert.equal(decoded.negative, -Infinity);
assert(Number.isNaN(decoded.invalid));

console.log('Проверки движка пройдены.');

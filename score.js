// Flip Score — pure scoring logic (shared by the app and the tests)
(function (root) {
  var MODS = [2, 4, 6, 8, 10];
  function emptyHand() { return { nums: [], x2: false, plus: [], bust: false, typed: '' }; }
  function scoreHand(h) {
    if (!h) return { score: 0, note: '0 number cards', kind: 'count' };
    if (h.typed !== '' && h.typed !== null && h.typed !== undefined && !isNaN(Number(h.typed))) {
      return { score: Math.round(Number(h.typed)), note: 'typed in', kind: 'typed' };
    }
    if (h.bust) return { score: 0, note: 'busted', kind: 'bust' };
    var sum = 0;
    for (var i = 0; i < h.nums.length; i++) sum += h.nums[i];
    if (h.x2) sum *= 2;
    for (var j = 0; j < h.plus.length; j++) sum += h.plus[j];
    var bonus = h.nums.length >= 7;
    if (bonus) sum += 15;
    return {
      score: sum,
      note: bonus ? 'includes the 15-point Flip 7 bonus' : (h.nums.length + ' number card' + (h.nums.length === 1 ? '' : 's')),
      kind: bonus ? 'bonus' : 'count'
    };
  }
  var api = { MODS: MODS, emptyHand: emptyHand, scoreHand: scoreHand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FlipScore = api;
})(this);

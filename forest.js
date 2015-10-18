// Forest management


/* Copyright (c) 2015 Joshua I Grams <josh@qualdan.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var disambiguate, prioritized_tree;
var process_forest, forest_to_html, evaluate_forest;
(function(){
	'use strict';


	// -------------------------------------------------------------------
	// Choose parse tree from forest by rule priority

	function is_ambiguous(f) { return f && f.left && !f.right; }

	disambiguate = function disambiguate(f, gt) {
		if(is_ambiguous(f)) {
			var best = f.left, d = f.left;
			while(d = d.next) {
				best = cmp(d, best, gt) > 0 ? d : best;
			}
			f.left = best.left;
			f.right = best.right;
			f.rule = best.rule;
		}
		// disambiguate child derivations
		if(f.left) disambiguate(f.left, gt);
		if(f.right) disambiguate(f.right, gt);
		return f;
	}

	function cmp(a, b, gt) {
		if(!(a || b)) return 0;
		else {
			disambiguate(a, gt);
			disambiguate(b, gt);
			if(a.rule == b.rule) {
				return cmp(a.left, b.left, gt)
					|| cmp(a.right, b.right, gt);
			} else if(gt(a.rule, b.rule)) return 1;
			else return -1;
		}
	}

	prioritized_tree = function prioritized_tree(f) {
		return disambiguate(f, higher_priority);
	}

	function higher_priority(a, b) { return a.priority > b.priority; }



	// -------------------------------------------------------------------
	// Forest walker

	function is_intermediate(f) { return f && f.tag && f.tag.symbol; }
	function is_derivation_list(f) { return f && f.hasOwnProperty('next'); }

	process_forest = function process_forest(f, fns) {
		if(!f) return;
		var result;
		if(is_derivation_list(f)) {
			result = [];
			while(f) {
				result.push(fns.derivation(collect_children(f, fns)));
				f = f.next;
			}
			result = fns.choices(result);
		} else if(is_intermediate(f)) {
			result = collect_children(f, fns);
		} else {                        // complete derivation
			var d = fns.derivation(collect_children(f, fns));
			result = fns.symbol(f, d);
		}
		return result;
	}

	function collect_children(f, fns) {
		var left = process_forest(f.left, fns);
		var right = process_forest(f.right, fns);

		var result;
		if(left !== undefined) {
			result = is_intermediate(f.left) ? left : [left];
			if(right) result.push(right);
		} else if(right !== undefined) result = [right];
		return result;
	}



	// -------------------------------------------------------------------
	// Evaluation:

	var expr_fns = {
		choices: function(c) { throw "Can't evaluate ambiguous parse."; },
		derivation: function(d) { return d; },
		symbol: function(i, d) {
			return i.rule ?
				(i.rule.action ? i.rule.action(d) : d[0])
				: (d ? d : i.tag);
		}
	};

	evaluate_forest = function evaluate_forest(f) {
		return process_forest(prioritized_tree(f), expr_fns);
	}


	// -------------------------------------------------------------------
	// Convert parse forest to nested HTML tables

	function html_derivation(d) {
		if(d) {
			var row = tr();
			for(var i=0; i<d.length; ++i) row.appendChild(td(d[i]));
			return row;
		}
	}

	function html_choices(choices) {
		var html = table();
		for(var i=0; i<choices.length; ++i) {
			html.appendChild(tr(td(choices[i])));
		}
		return html;
	}

	function html_symbol(item, derivation) {
		item = text(item.hasOwnProperty('tag') ? item.tag : item);
		if(derivation) {
			var symbol = td(item);  symbol.colSpan = derivation.length;
			var html = table(tr(symbol));
			html.appendChild(derivation);
			return html;
		} else return item;
	}

	var html_fns = {
		choices: html_choices,
		derivation: html_derivation,
		symbol: html_symbol
	}

	forest_to_html = function forest_to_html(f) {
		return process_forest(f, html_fns);
	}

})();


	// -------------------------------------------------------------------
	// Misc HTML helpers

	function elt(name, child) {
		var e = document.createElement(name);
		if(child) e.appendChild(child);
		return e;
	}
	function table(node) { return elt('table', node); }
	function tr(node) { return elt('tr', node); }
	function td(node) { return elt('td', node); }
	function text(str) { return document.createTextNode(str); }

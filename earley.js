// The core parsing algorithm


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

var Rule, Grammar;
(function(){
	'use strict';

	Grammar = function Grammar(startSymbol, rules) {
		this.S = startSymbol;
		this.rules = {};
		for(var i=0; i<rules.length; ++i) {
			instantiate_rule(rules[i], rules.length - i);
			var sym = rules[i].symbol;
			this.rules[sym] = this.rules[sym] || [];
			this.rules[sym].push(rules[i]);
		}
	}

	Grammar.prototype.parse = function earleyParse(input) {
		var s0 = process(predict(new Set(this, 0), this.S));
		var sN = Array.prototype.reduce.call(input, parse_symbol, s0);
		return find_item(this.S, s0, sN);
	}

	function parse_symbol(set, sym) { return process(scan(set, sym)); }

	function process(set) {
		do { var len = set.items.length;
			for(var i=0; i<set.items.length; ++i) {
				var item = set.items[i];
				if(item.tag.nextSymbol) predict(set, item.tag.nextSymbol);
				else complete(item);
			}
		} while(set.items.length > len);  // cheesy nullable-rule handling
		return set;
	}

	function scan(s1, sym) {
		var s2 = new Set(s1.grammar, s1.position + 1);
		var item = add_item(sym, s1, s2);
		return s2;
	}

	function complete(c) {
		var items = c.start.wants[c.tag];
		if(items) for(var i=0; i<items.length; ++i) {
			var item = items[i], tag = item.tag;
			add_derivation(add_item(tag.advance, item.start, c.end, item.rule),
					item, c, item.rule);
		}

		items = c.start.wants_many;
		if(items) for(var i=0; i<items.length; ++i) {
			var item = items[i], tag = item.tag;
			// rule can get deleted by add_second_derivation
			if(item.rule.wants_sym(c.tag)) {
				add_derivation(add_item(tag.advance, item.start, c.end, item.rule),
						item, c, item.rule);
			}
		}
	}

	function predict(set, sym) {
		var rules = set.grammar.rules[sym];
		if(rules) for(var i=0; i<rules.length; ++i) {
			var item = add_item(rules[i].advance, set, set, rules[i]);
			if(!item.tag.production) {
				var empty = add_item('', set, set);
				add_derivation(item, undefined, empty, item.rule);
			}
		}
		return set;
	}


	// -------------------------------------------------------------------
	// A Set contains all Items ending at a particular input position.

	function Set(grammar, position) {
		this.grammar = grammar;    // access to grammar w/o a global var
		this.position = position;  // input position
		this.idx = {};    // all items by tag and start for uniqueness
		this.items = [];  // items for iteration/processing
		this.wants = {};  // incomplete items by next symbol
		this.wants_many = [];  // incomplete items matching char classes
	}


	// -------------------------------------------------------------------
	// An Item represents a step in the process of matching a piece of the
	// input: an input symbol, a complete derivation for a symbol, or a
	// partial match for a rule.

	function Item(tag, start, end, rule) {
		this.tag = tag;
		this.start = start;
		this.end = end;
		this.rule = rule;

		end.items.push(this);

		if(!end.idx.hasOwnProperty(tag)) end.idx[tag] = {};
		end.idx[tag][start.position] = this;

		var sym; if(sym = tag.nextSymbol) {  // incomplete
			if(!end.wants.hasOwnProperty(sym)) end.wants[sym] = [];
			end.wants[sym].push(this);
			if(rule.wants_sym) end.wants_many.push(this);
		}

	}

	Item.prototype.toString = function() {
		return this.start.position + '..' + this.end.position + ': ' + this.tag;
	}

	function add_item(tag, start, end, rule) {
		return find_item(tag, start, end) || new Item(tag, start, end, rule);
	}

	function find_item(tag, start, end) {
		return end.idx.hasOwnProperty(tag) && end.idx[tag][start.position];
	}


	// -------------------------------------------------------------------
	// Left/right pointers give the derivation(s) for an item.  The
	// right pointer gives the derivations for the rightmost matched
	// symbol, the left pointer gives the derivations for the remainder.
	// There are four cases:
	// - null/null: no derivations yet
	// - item/item or null/item: single derivation
	// - deriv/null: multiple derivations


	function Derivation(left, right, next, rule) {
		this.left = left;
		this.right = right;
		this.next = next;
		this.rule = rule;
	}

	function add_derivation(item, left, right, rule) {
		if(!(left || right)) return;

		// remove trivial nodes on left
		if(left && left.tag && left.tag.production && left.tag.dot <= 1) {
			if(left.tag.dot <= 1) left = left.right;
		}

		if(!(item.left || item.right)) set_derivation(item, left, right, rule);
		else if(item.right) add_second_derivation(item, left, right, rule);
		else add_another_derivation(item, left, right, rule);
	}

	function set_derivation(i, l, r, rule) { i.left = l;  i.right = r;  i.rule = rule; }

	function same_derivation(i, l, r) { return i.left+''==l+'' && i.right+''==r+''; }

	function add_second_derivation(i, l, r, rule) {
		if(!same_derivation(i, l, r)) {
			var old = new Derivation(i.left, i.right, null, i.rule);
			i.left = new Derivation(l, r, old, rule);
			delete(i.right);  delete(i.rule);
		}
	}

	function add_another_derivation(i, l, r, rule) {
		var d=i;  while(d=d.next || d.left) if(same_derivation(d, l, r)) return;
		i.left = new Derivation(l, r, i.left, rule);
	}


	// -------------------------------------------------------------------

	Rule = function Rule(symbol, production, action, wants_sym) {
		this.symbol = symbol + '';
		this.production = production;
		this.action = action;
		if(wants_sym) this.wants_sym = wants_sym;
	}

	function instantiate_rule(rule, priority) {
		rule.priority = priority;
		var n = rule.production.length;
		for(var i=0; i<n; ++i) {
			rule.advance = new Rule(rule.symbol, rule.production);
			rule = rule.advance;
			rule.priority = priority;
			rule.dot = i;
			rule.nextSymbol = rule.production[i];
		}
		rule.advance = rule.symbol;
	}

	Rule.prototype.toString = function() {
		var s = this.symbol + ' -> ' + (this.dot===0 ? '• ' : '');
		for(var i=0; i<this.production.length; ++i) {
			s += this.production[i] + (i+1===this.dot ? ' • ' : ' ');
		}
		return s;
	}

})();

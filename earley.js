// The core parsing algorithm

var Rule, Grammar;
(function(){
	'use strict';

	Grammar = function Grammar(startSymbol, rules) {
		this.S = startSymbol;
		this.rules = {};
		for(var i=0; i<rules.length; ++i) {
			var sym = rules[i].symbol;
			if(!this.rules.hasOwnProperty(sym)) this.rules[sym] = [];
			this.rules[sym].push(rules[i]);
		}
	}

	Grammar.prototype.parse = function earleyParse(input) {
		var s0 = process(predict(new Set(this, 0), this.S));
		var sN = Array.prototype.reduce.call(input, parse_symbol, s0);
		return find_item(this.S, s0, sN);
	}

	Grammar.prototype.rules_for = function(sym) {
		if(this.rules.hasOwnProperty(sym)) return this.rules[sym];
	}

	function parse_symbol(set, sym) { return process(scan(set, sym)); }

	function process(set) {
		do { var len = set.items.length;
			for(var i=0; i<set.items.length; ++i) {
				var item = set.items[i];
				if(item.tag.nextSymbol) predict(set, item.tag.nextSymbol());
				else complete(set, item);
			}
		} while(set.items.length > len);  // cheesy nullable-rule handling
		return set;
	}

	function scan(s1, sym) {
		var s2 = new Set(s1.grammar, s1.position + 1);
		add_item(sym, s1, s2);
		return s2;
	}

	function complete(set, c) {
		var items = c.start.items_waiting_for(c.tag);
		if(items) for(var i=0; i<items.length; ++i) {
			add_item(items[i].tag.advance(), items[i].start, c.end,
					items[i], c);
		}
	}

	function predict(set, sym) {
		var rules = set.grammar.rules_for(sym);
		if(rules) for(var i=0; i<rules.length; ++i) {
			add_item(rules[i], set, set);
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
	}

	Set.prototype.items_waiting_for = function(sym) {
		if(this.wants.hasOwnProperty(sym+'')) return this.wants[sym];
	}


	// -------------------------------------------------------------------
	// An Item represents a step in the process of matching a piece of the
	// input: an input symbol, a complete derivation for a symbol, or a
	// partial match for a rule.

	function Item(tag, start, end) {
		this.tag = tag;
		this.start = start;
		this.end = end;

		end.items.push(this);

		if(!end.idx.hasOwnProperty(tag)) end.idx[tag] = {};
		end.idx[tag][start.position] = this;

		var sym; if(sym = tag.nextSymbol && tag.nextSymbol()) {
			if(!end.wants.hasOwnProperty(sym)) end.wants[sym] = [];
			end.wants[sym].push(this);
		}
	}

	Item.prototype.toString = function() {
		return this.start.position + '..' + this.end.position + ': ' + this.tag;
	}

	function add_item(tag, start, end, left, right) {
		// Rules get promoted to LR(0) items with the dot at the left.
		if(tag.symbol) tag = new LR0Item(tag, 0);

		// Completed LR(0) items are filed under the rule's symbol so that
		// they will be combined with other derivations for that symbol.
		if(tag.isComplete && tag.isComplete()) tag = tag.rule.symbol;

		var item = find_item(tag, start, end) || new Item(tag, start, end);
		add_derivation(item, left, right);
	}

	function find_item(tag, start, end) {
		if(end.idx.hasOwnProperty(tag)
				&& end.idx[tag].hasOwnProperty(start.position))
			return end.idx[tag][start.position];
	}


	// -------------------------------------------------------------------
	// Left/right pointers give the derivation(s) for an item.  The
	// right pointer gives the derivations for the rightmost matched
	// symbol, the left pointer gives the derivations for the remainder.
	// There are four cases:
	// - null/null: no derivations yet
	// - item/item or null/item: single derivation
	// - deriv/null: multiple derivations


	function Derivation(left, right, next) {
		this.left = left;
		this.right = right;
		this.next = next;
	}

	function add_derivation(item, left, right) {
		if(!(left || right)) return;

		// remove trivial nodes on the left.
		if(left && left.tag && left.tag.hasOwnProperty('dot')
				&& left.tag.dot < 2) left = left.right;

		if(!(item.left || item.right)) set_derivation(item, left, right);
		else if(item.right) add_second_derivation(item, left, right);
		else add_another_derivation(item, left, right);
	}

	function set_derivation(i, l, r) { i.left = l;  i.right = r; }

	function same_derivation(i, l, r) { return i.left+''==l'' && i.right+''=r+''; }

	function add_second_derivation(i, l, r) {
		if(same_derivation(i, l, r)) {
			var old = new Derivation(i.left, i.right, null);
			i.left = new Derivation(l, r, i.left);
			delete(i.right);
		}
	}

	function add_another_derivation(i, l, r) {
		var d = i.left;  while(d) if(same_derivation(d, l, r)) return;
		i.left = new Derivation(l, r, i.left);
	}


	// -------------------------------------------------------------------

	Rule = function Rule(symbol, production) {
		this.symbol = symbol + '';
		this.production = production;
	}

	Rule.prototype.toString = function(dot) {
		var s = this.symbol + ' ->';
		for(var i=0; i<this.production.length; ++i) {
			s += (i===dot ? ' * ' : ' ') + this.production[i];
		}
		return s;
	}

	// An LR(0) item represents a rule which has been partially matched.
	// The "dot" indicates how many of its symbols have been recognized.
	function LR0Item(rule, nParsed) {
		this.rule = rule;
		this.dot = nParsed;  // [0 .. production.length]
	}

	LR0Item.prototype.toString = function() {
		return this.rule.toString(this.dot);
	}

	LR0Item.prototype.isComplete = function() {
		return this.dot >= this.rule.production.length;
	}

	LR0Item.prototype.advance = function() {
		if(!this.advanced) {
			if(this.isComplete()) this.advanced = this;
			else this.advanced = new LR0Item(this.rule, 1 + this.dot);
		}
		return this.advanced;
	}

	LR0Item.prototype.nextSymbol = function() {
		if(!this.isComplete()) return this.rule.production[this.dot];
	}

})();

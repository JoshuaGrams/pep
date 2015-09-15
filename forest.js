var forest_to_html, process_forest;
(function(){
	'use strict';

	process_forest = function process_forest(f, fns) {
		if(!f) return;
		var result;
		if(f.hasOwnProperty('next')) {  // ambiguous derivation
			result = [];
			while(f) {
				var d = fns.derivation(process_children(f, fns));
				result.push(d);
				f = f.next;
			}
			result = fns.choices(result);
		} else if(f.tag.rule) {         // intermediate node
			result = process_children(f, fns);
		} else {                        // complete derivation
			var d = fns.derivation(process_children(f, fns));
			result = fns.symbol(f.tag, d);
		}
		return result;
	}

	function process_children(f, fns) {
		var left = process_forest(f.left, fns);
		var right = process_forest(f.right, fns);
		if(left && right) {
			if(!(f.left && f.left.tag && f.left.tag.rule)) left = [left];
			left.push(right);
			return left;
		} else if(left || right) return [left || right];
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

	function html_symbol(name, derivation) {
		name = text(name);
		if(derivation) {
			var symbol = td(name);  symbol.colSpan = derivation.length;
			var html = table(tr(symbol));
			html.appendChild(derivation);
			return html;
		} else return name;
	}

	var html_fns = {
		choices: html_choices,
		derivation: html_derivation,
		symbol: html_symbol
	}

	forest_to_html = function forest_to_html(f) {
		return process_forest(f, html_fns);
	}


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

})();

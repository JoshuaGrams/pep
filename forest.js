var forest_to_html, process_forest;
(function(){
	'use strict';

	function is_intermediate(f) { return f && f.tag && f.tag.rule; }
	function is_ambiguous(f) { return f && f.hasOwnProperty('next'); }

	process_forest = function process_forest(f, fns) {
		if(!f) return;
		var result;
		if(is_ambiguous(f)) {
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
			result = fns.symbol(f.tag, d);
		}
		return result;
	}

	function collect_children(f, fns) {
		var left = process_forest(f.left, fns);
		var right = process_forest(f.right, fns);

		var result;
		if(left) {
			result = is_intermediate(f.left) ? left : [left];
			if(right) result.push(right);
		} else if(right) result = [right];
		return result;
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

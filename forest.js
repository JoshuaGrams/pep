var forest_to_html, process_forest;
(function(){
	'use strict';

	process_forest = function process_forest(f, fns) {
		if(!f) return;
		var result;
		if(f.hasOwnProperty('next')) {  // ambiguous derivation
			result = [];
			while(f) { result.push(process_children(f, fns));  f = f.next; }
			result = fns.choices(result);
		} else if(f.tag.rule) {         // intermediate node
			result = process_children(f, fns);
		} else {                        // complete derivation
			result = process_children(f, fns);
			if(result) result = fns.non_terminal(f.tag, result);
			else result = fns.terminal(f.tag);
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
		var row = tr();
		for(var i=0; i<d.length; ++i) row.appendChild(td(d[i]));
		return row;
	}

	function html_choices(choices) {
		var html = table();
		for(var i=0; i<choices.length; ++i) {
			html.appendChild(tr(td(html_derivation(choices[i]))));
		}
		return html;
	}

	function html_terminal(name) { return text(name); }

	function html_non_terminal(name, derivation) {
		name = text(name);
		if(derivation && derivation.length) {
			var symbol = td(name);  symbol.colSpan = derivation.length;
			var data = html_derivation(derivation);
			var html = table(tr(symbol));
			html.appendChild(data);
			return html;
		} else return symbol;
	}

	var html_fns = {
		choices: html_choices,
		terminal: html_terminal,
		non_terminal: html_non_terminal
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

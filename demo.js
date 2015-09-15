var forest_to_html;
(function(){
	'use strict';

	// -------------------------------------------------------------------
	// Convert parse forest to nested HTML tables

	forest_to_html = function forest_to_html(f) {
		if(!f) return;

		var result;
		if(f.hasOwnProperty('next')) {  // Derivation list 
			result = table();
			while(f) {
				var child = children_to_html(f);
				if(child.nodeName.toLowerCase() !== 'tr') {
					child = tr(td(child));
				}
				result.appendChild(child);
				f = f.next;
			}
		} else if(f.tag.rule) {  // LR(0) item
			result = children_to_html(f);
		} else {                 // Symbol item
			result = children_to_html(f);
			if(result) {
				if(result.nodeName.toLowerCase() !== 'tr') {
					result = tr(td(result));
				}
				var tag = td(text(f.tag));
				tag.colSpan = result.cells.length;
				tag = table(tr(tag));
				tag.appendChild(result);
				result = tag;
			} else result = text(f.tag);
		}
		return result;
	}

	function children_to_html(f) {
		var left = forest_to_html(f.left);
		var right = forest_to_html(f.right);
		if(left && right) {
			if(left.nodeName.toLowerCase() !== 'tr') left = tr(td(left));
			left.appendChild(td(right));
			return left;
		} else return left || right;
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

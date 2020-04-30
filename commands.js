const fb_utils = require('./fb_utils');
const db_utils = require('./db_utils');
const market = require('./market');

function parse(sid, str) {

	tokens = str.replace('@',' @ ').replace('$',' $ ').replace(/\s+/g,' ').split(' ');
	var side="sell";
	switch(tokens[0]) {
		case "show":
		case "display":
			switch(tokens[1]) {
				case "orders":
					show_orders(sid);
					break;
			}
			break;
		case "buy":
			side="buy";
		case "sell":
			parse_order(sid, tokens, side);
			break;
		default:
			help(sid);
			break;
	}
}

function parse_order(sid, tokens, side){
	find_symbol(tokens).then(symbol=>{
		var price="";
		var quantity="";
		var price_mode = false;
		for(var i=1;i<tokens.length;i++){
			if(tokens[i] == "$" || tokens[i] == "@"){
				price_mode = true;
			}
			if (!isNaN(tokens[i])){
				value = parseFloat(tokens[i]);
				if (price_mode){
					price = value;
					price_mode = false;
					if (quantity  != "") break;
				} else {
					quantity = value;
					price_mode = true;
					if (price != "") break;
				}
			}
		}
		bad_parse_list = [];
		if (symbol == "" ) bad_parse_list.push("symbol");
		if (price == "" ) bad_parse_list.push("price");
		if (quantity == "") bad_parse_list.push("quantity");

		if (bad_parse_list.length > 0){
			text = "I couldn't parse " + bad_parse_list.join(", ") + " in your order request";
			fb_utils.sendText(sid, text);
		} else {
			market.order(sid, side, symbol, price, quantity);
		}
	});
}



function find_symbol(tokens){
	return db_utils.get_symbols().then(symbols=>{
		for (var i=0;i<symbols.length;i++){
			for (var j=1;j<tokens.length;j++){
				if (symbols[i] == tokens[j].toUpperCase()){
					return symbols[i];
				}
			}
		}
		return "";
	});
}

function show_orders(sid){
	fb_utils.sendText(sid, 'no orders yet');
}

function help(sid){
	fb_utils.sendText(sid, 'i hope this is helpful');
}


module.exports = {
	parse: parse
}
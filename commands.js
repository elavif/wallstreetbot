const fb_utils = require('./fb_utils');
const db_utils = require('./db_utils');
const market = require('./market');

async function parse(sid, str) {

	var tokens = str.replace('@',' @ ').replace('$',' $ ').replace(/\s+/g,' ').split(' ');
	var side="sell";
	switch(tokens[0]) {
		case "show":
		case "display":
			switch(tokens[1]) {
				case "orders":
					show_orders(sid, tokens);
					break;
				case "positions":
					show_positions(sid, tokens);
					break;
				case "symbols":
					show_symbols(sid);
				default:
					help_show(sid);
					break;
			}
			break;
		case "buy":
			side="buy";
		case "sell":
			parse_order(sid, tokens, side);
			break;
		case "cancel":
			cancel(sid, tokens);
			break;

		case "admin":
			switch(tokens[1]){
				case "bestow":
					admin_bestow(sid, tokens);
					break;
			}
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

function table_to_string(arr2d){
	var str = "";
	var col_lengths=[];
	for (var j=0;j< arr2d[0].length;j++){
		var max_length = 0;
		for (var i=0;i<arr2d.length;i++){
			if (arr2d[i][j].length > max_length)
				max_length = arr2d[i][j].length;
		}
		if (j!= arr2d[0].length-1) max_length += 2;
		col_lengths.push(max_length);
	}
	for (var i=0;i<arr2d.length;i++){
		for (var j=0;j<arr2d[i].length;j++){
			elem = arr2d[i][j];
			while (elem.length < col_lengths[j]) elem += " ";
			str += elem;
		}
		if (i != arr2d.length-1) str+="\n";
	}
	return str;
}

function show_orders(sid, tokens){
	find_symbol(tokens).then(symbol=>{
		if (symbol == ""){
			fb_utils.sendText(sid, "Please specify symbol");
		}
		else {
			db_utils.get_order_book(symbol, 'buy').then(orders=>{
				var buy_txt = "Buy-side:\n";
				var table = [["user", "#", "$"]];
				for (var i=0;i<orders.length;i++){
					table.push([orders[i].name.substring(0,5), orders[i].quantity, orders[i].price]);
				}
				buy_txt += table_to_string(table);
				fb_utils.sendText(sid, buy_txt);
			});
			db_utils.get_order_book(symbol, 'sell').then(orders=>{
				var sell_txt = "Sell-side:\n";
				var table = [["user", "#", "$"]];
				for (var i=0;i<orders.length;i++){
					table.push([orders[i].name.substring(0,5), orders[i].quantity, orders[i].price]);
				}
				sell_txt += table_to_string(table);
				fb_utils.sendText(sid, sell_txt)
			});
		}
	})
}

function show_positions(sid, tokens){
		find_symbol(tokens).then(symbol=>{
		if (symbol == ""){
			fb_utils.sendText(sid, "Please specify symbol");
		}
		else {
			db_utils.get_position_table(symbol).then(positions=>{
				var table = [["user", "#units", "$"]];
				for (var i=0;i<positions.length;i++){
					table.push([positions[i].name.substring(0,5), positions[i].units, positions[i].currency]);
				}
				fb_utils.sendText(sid, table_to_string(table))
			});
		}
	})
}

function show_symbols(sid){
	db_utils.get_symbol_descriptions().then(descs=>{
		var txt = "";
		for (var i=0;i<descs.length;i++){
			txt+= `${descs[i].symbol}: ${descs[i].description}\n`;
		}
		fb_utils.sendText(sid, txt);
	});
}

function cancel(sid, tokens){
	find_symbol(tokens).then(symbol=>{
		if (symbol == ""){
			fb_utils.sendText(sid, "Please specify symbol");
		}
		else {
			db_utils.cancel_orders(sid, symbol).then(res=>{
				db_utils.get_user(sid).then(user=>{
					fb_utils.sendGlobalText(`${user[0].name} has cancelled their ${symbol} orders`);
				});
			});
		}

	});
}

function help_show(sid){
	fb_utils.sendText(sid, 'Commands:\nshow orders ...\nshow positions ...\nshow symbols');
}

function help(sid){
	fb_utils.sendText(sid, 'Commands:\nbuy ...\nsell ...\nshow...\ncancel...');
}

function admin_bestow(sid, tokens){
	if (parseInt(sid) == 2973343992754997){
		name = tokens[2];
		symbol = tokens[3];
		units = parseFloat(tokens[4]);
		currency = parseFloat(tokens[5]);
		var u_sid = "";
		var full_name="";
		db_utils.get_users().then(users=>{
			for (var i=0;i<users.length;i++){
				if (users[i].name.toUpperCase().startsWith(name.toUpperCase())){
					u_sid = users[i].sid;
					full_name = users[i].name;
					break;
				}
			}
			if (u_sid == ""){
				fb_utils.sendText(sid, 'Could not find user');
			}
			else {
				market.modify_position(u_sid, symbol, units, currency);
				fb_utils.sendGlobalText(`Admin has bestowed ${full_name} with ${units} ${symbol} and \$${currency}`);
			}
		})
	}
}

module.exports = {
	parse: parse
}
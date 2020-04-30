const { Pool } = require('pg');


var pool;

function get_pool(){
	if (pool) return pool;
	pool = new Pool({
	     connectionString: process.env.DATABASE_URL,
	     ssl: process.env.hasOwnProperty("WSB_DO_USE_SSL"),
	});
	return pool;
}


function query(str, replace_list=[]){
	return new Promise(
			(resolve, reject) =>{
				get_pool().connect().then(client=>
				client.query(str, replace_list).then(res => resolve(res.rows)).catch(
					err => {
					console.log(err.stack);
					reject(err);
				}));
			});
}

function get_symbols(){
	return query('SELECT symbol from symbols;').then(res=>{
		ret = [];
		for (var i=0;i<res.length;i++){
			ret.push(res[i].symbol);
		}
		return ret;
	});
}

function get_users(){
	//return query('INSERT INTO users (sid, name) values (314, \'PI\')');
	return query('SELECT * FROM users');
}

function get_all_sids(){
	return query('SELECT sid FROM users').then(res=>{
		ret = [];
		for (var i=0;i<res.length;i++){
			ret.push(parseInt(res[i].sid));
		}
		return ret;
	});
}

function get_user(sid){
	return query('SELECT * FROM users WHERE sid=$1', [sid]);
}

function add_user(sid, name){
	return query('INSERT INTO users (sid, name) values ($1, $2)', [sid, name]);
}

function get_order_book(symbol, side){
	order = "ASC";
	if (side == "buy"){
		order="DESC";
	}
	return query('SELECT price, quantity FROM orders WHERE symbol=$1 AND side=$2 AND status=\'open\' ORDER BY PRICE '+order+' time ASC;');
}

function add_order(sid, side, symbol, price, quantity){
	return query("INSERT INTO orders (sid, side, symbol, price, quantity) VALUES ($1, $2, $3, $4, $5)",
		[sid, side, symbol, price, quantity]);
}


module.exports = {
	get_pool,
	query: query,
	get_users: get_users,
	get_all_sids: get_all_sids,
	get_user: get_user,
	add_user: add_user,
	get_symbols: get_symbols,
	get_order_book: get_order_book,
	add_order,
}

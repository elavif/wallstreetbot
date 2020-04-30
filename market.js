const db_utils = require('./db_utils');
const fb_utils = require('./fb_utils');


function order(sid, side, symbol, price, quantity){
	db_utils.add_order(sid, side, symbol, price, quantity).then(res => check_execution(symbol));
	db_utils.get_user(sid).then(user=>{
		fb_utils.sendGlobalText(`${user[0].name} placed a ${side} order of ${quantity} ${symbol} @ \$${price}`);
	});
}


async function check_execution(symbol) { (async() => {
	var check_again = false;
	const client = await db_utils.get_pool().connect();
	try {
		await client.query('BEGIN');
		const buy_rows = (await client.query('SELECT * FROM orders WHERE symbol=$1 AND side=\'buy\' AND status = \'open\' ORDER BY PRICE DESC, time ASC', [symbol])).rows;
		const sell_rows = (await client.query('SELECT * FROM orders WHERE symbol=$1 AND side=\'sell\' AND status = \'open\' ORDER BY PRICE ASC, time ASC', [symbol])).rows;
		if (buy_rows.length > 0 && sell_rows.length > 0){
			const buy = buy_rows[0];
			const sell = sell_rows[0];
			buy.quantity = parseFloat(buy.quantity);
			buy.price = parseFloat(buy.price);
			sell.quantity = parseFloat(sell.quantity);
			sell.price = parseFloat(sell.price);
			if (buy.price >= sell.price) {
				var exec_price = buy.time < sell.time ? buy.price : sell.price;
				var exec_quantity = buy.quantity < sell.quantity ? buy.quantity : sell.quantity;
				modify_position(buy.sid, buy.symbol, exec_quantity, -exec_quantity * exec_price);
				modify_position(sell.sid, sell.symbol, -exec_quantity, exec_quantity * exec_price);
				if (buy.quantity == exec_quantity) {
					await client.query('UPDATE orders SET status=\'filled\' WHERE id=$1', [buy.id]);
				} else {
					await client.query('UPDATE orders SET quantity=$2 WHERE id=$1', [buy.id, buy.quantity - exec_quantity]);
				}
				if (sell.quantity == exec_quantity) {
					await client.query('UPDATE orders SET status=\'filled\' WHERE id=$1', [sell.id]);
				} else {
					await client.query('UPDATE orders SET quantity=$2 WHERE id=$1', [sell.id, sell.quantity - exec_quantity]);
				}
				db_utils.get_user(buy.sid).then(buy_user=>{
					db_utils.get_user(sell.sid).then(sell_user=>{
						fb_utils.sendGlobalText(`Executed ${exec_quantity} ${symbol} @ \$${exec_price} ${sell_user[0].name} -> ${buy_user[0].name}`);
					})
				});
			}
			check_again = true;
		}

		await client.query('COMMIT');
	} catch (e) {
		await client.query('ROLLBACK');
		throw e;
	} finally {
		client.release();
	}

	if (check_again){
		return check_execution(symbol);
	}


})().catch(e => console.error(e.stack));}

async function modify_position(sid, symbol, inc_units, inc_currency) { (async() => {
	const client = await db_utils.get_pool().connect();
	try {
		await client.query('BEGIN');
		const position_rows = (await client.query('SELECT units, currency FROM positions WHERE sid=$1 AND symbol=$2', [sid, symbol])).rows;
		if (position_rows.length == 0){
			await client.query('INSERT INTO positions (sid, symbol, units, currency) VALUES ($1, $2, $3, $4)',[sid, symbol, inc_units, inc_currency]);
		} else {
			await client.query('UPDATE positions SET units = $3, currency = $4 WHERE sid=$1 AND symbol=$2',[sid, symbol, parseFloat(position_rows[0].units) + inc_units, parseFloat(position_rows[0].currency) + inc_currency]);
		}

		await client.query('COMMIT');
	} catch (e) {
		await client.query('ROLLBACK');
		throw e;
	} finally {
		client.release();
	}

})().catch(e => console.error(e.stack));}


module.exports = {
	order: order,
	modify_position: modify_position,
}
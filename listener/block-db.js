/**
 * Created by zhangtailin on 2018/3/6.
 */
let mysql = require('mysql');
var log4js = require('log4js');
var logger = log4js.getLogger('blockdb');
logger.setLevel('DEBUG');

let pool = mysql.createPool({
    host     : "localhost",
    user     : "root",
    password : "123456",
    port: "3306",
    database: "explore"
});

let query = (sql, param) => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.log("======链接错误======");
                
                reject(err);
            } else {
                connection.query(sql, param, (err, rows) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                    connection.release();
                });
            }
        });
    });
}

exports.query = query;

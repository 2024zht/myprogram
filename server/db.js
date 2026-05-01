const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'shop.db')
const db = new Database(dbPath)

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL')

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    sort INTEGER DEFAULT 999,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category_id INTEGER,
    price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    image TEXT DEFAULT '',
    rating REAL DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_openid TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    content TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(user_openid, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_openid TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    remark TEXT DEFAULT '',
    total_price REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    name TEXT NOT NULL,
    price REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS users (
    openid TEXT PRIMARY KEY,
    nickname TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`)

// 兼容旧表：添加缺失的列
function addColumnIfMissing(table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.find(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
  }
}
try { addColumnIfMissing('orders', 'user_openid', "TEXT DEFAULT ''") } catch(e) {}
try { addColumnIfMissing('orders', 'remark', "TEXT DEFAULT ''") } catch(e) {}
try { addColumnIfMissing('products', 'rating', 'REAL DEFAULT 5.0') } catch(e) {}
try { addColumnIfMissing('products', 'review_count', 'INTEGER DEFAULT 0') } catch(e) {}

module.exports = db

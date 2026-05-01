const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const https = require('https')
const db = require('./db')

// 加载 .env
function loadEnv() {
  const envPath = path.join(__dirname, '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim()
      const val = trimmed.substring(idx + 1).trim()
      if (val) process.env[key] = val
    }
  }
}
loadEnv()

const WECHAT_APPID = process.env.WECHAT_APPID
const WECHAT_SECRET = process.env.WECHAT_SECRET
const WECHAT_TEMPLATE_ID = process.env.WECHAT_TEMPLATE_ID

const app = express()

// ---- 微信订阅消息通知 ----
let cachedToken = null
let tokenExpire = 0

function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (cachedToken && Date.now() < tokenExpire) return resolve(cachedToken)
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`
    https.get(url, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.access_token) {
            cachedToken = json.access_token
            tokenExpire = Date.now() + (json.expires_in - 300) * 1000
            resolve(cachedToken)
          } else {
            reject(new Error('获取access_token失败: ' + data))
          }
        } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

function sendSubscribeMessage(openid, data) {
  return getAccessToken().then(token => {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        touser: openid,
        template_id: WECHAT_TEMPLATE_ID,
        page: '/pages/orders/orders',
        data
      })
      const options = {
        hostname: 'api.weixin.qq.com',
        path: `/cgi-bin/message/subscribe/send?access_token=${token}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }
      const req = https.request(options, res => {
        let result = ''
        res.on('data', c => result += c)
        res.on('end', () => {
          const json = JSON.parse(result)
          if (json.errcode === 0) resolve(json)
          else reject(new Error('订阅消息发送失败: ' + result))
        })
      })
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  })
}

function getBossOpenid() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'boss_openid'").get()
  return row ? row.value : ''
}

function notifyBoss(orderId, productName) {
  const openid = getBossOpenid()
  if (!openid) return
  const now = new Date()
  const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  sendSubscribeMessage(openid, {
    time5: { value: timeStr },
    character_string6: { value: String(orderId) },
    thing4: { value: '小程序下单' },
    thing10: { value: productName },
    time19: { value: timeStr }
  }).catch(err => console.error('通知老板失败:', err.message))
}
const PORT = process.env.PORT || 7985

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + ext)
  }
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

// 类目
app.get('/api/categories', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort ASC, created_at ASC').all()
  res.json({ success: true, data: rows })
})

app.post('/api/categories', (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) return res.json({ success: false, errMsg: '类目名称不能为空' })
  const info = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim())
  res.json({ success: true, id: info.lastInsertRowid })
})

app.delete('/api/categories/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
  db.prepare('DELETE FROM products WHERE category_id = ?').run(req.params.id)
  res.json({ success: true })
})

app.put('/api/categories/:id/sort', (req, res) => {
  db.prepare('UPDATE categories SET sort = ? WHERE id = ?').run(req.body.sort, req.params.id)
  res.json({ success: true })
})

// 商品
app.get('/api/products', (req, res) => {
  const { category_id, keyword } = req.query
  let sql = 'SELECT * FROM products WHERE 1=1'
  const params = []
  if (category_id) { sql += ' AND category_id = ?'; params.push(category_id) }
  if (keyword && keyword.trim()) { sql += ' AND name LIKE ?'; params.push('%' + keyword.trim() + '%') }
  sql += ' ORDER BY created_at DESC LIMIT 100'
  res.json({ success: true, data: db.prepare(sql).all(...params) })
})

app.post('/api/products', (req, res) => {
  const { name, description, category_id, price, stock, image } = req.body
  if (!name || !name.trim()) return res.json({ success: false, errMsg: '商品名称不能为空' })
  const info = db.prepare(
    'INSERT INTO products (name, description, category_id, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), (description || '').trim(), category_id || null, parseFloat(price) || 0, parseInt(stock) || 0, image || '')
  res.json({ success: true, id: info.lastInsertRowid })
})

app.put('/api/products/:id', (req, res) => {
  const { name, description, category_id, price, stock, image } = req.body
  const fields = [], params = []
  if (name !== undefined) { fields.push('name = ?'); params.push(name.trim()) }
  if (description !== undefined) { fields.push('description = ?'); params.push(description.trim()) }
  if (category_id !== undefined) { fields.push('category_id = ?'); params.push(category_id) }
  if (price !== undefined) { fields.push('price = ?'); params.push(parseFloat(price)) }
  if (stock !== undefined) { fields.push('stock = ?'); params.push(parseInt(stock)) }
  if (image !== undefined) { fields.push('image = ?'); params.push(image) }
  if (!fields.length) return res.json({ success: false, errMsg: '没有要更新的字段' })
  params.push(req.params.id)
  db.prepare('UPDATE products SET ' + fields.join(', ') + ' WHERE id = ?').run(...params)
  res.json({ success: true })
})

app.delete('/api/products/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// 订单
app.get('/api/orders', (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?').all(limit)
  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?')
  res.json({ success: true, data: orders.map(o => ({ ...o, items: itemStmt.all(o.id) })) })
})

app.post('/api/orders', (req, res) => {
  const { items, user_openid, remark } = req.body
  if (!items || !items.length) return res.json({ success: false, errMsg: '订单项不能为空' })
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const orderId = db.transaction(() => {
    const info = db.prepare('INSERT INTO orders (user_openid, total_price, remark) VALUES (?, ?, ?)').run(user_openid || '', totalPrice, remark || '')
    const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)')
    for (const i of items) stmt.run(info.lastInsertRowid, i.product_id, i.name, i.price, i.quantity)
    return info.lastInsertRowid
  })()
  // 通知老板
  notifyBoss(orderId, items[0].name)
  res.json({ success: true, id: orderId })
})

app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body
  if (!status) return res.json({ success: false, errMsg: '缺少状态参数' })
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)
  res.json({ success: true })
})

// 图片上传
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ success: false, errMsg: '没有上传文件' })
  res.json({ success: true, url: '/uploads/' + req.file.filename })
})

// 老板注册 openid（老板端调用，用于接收订阅消息）
app.post('/api/register-boss', (req, res) => {
  const { openid } = req.body
  if (!openid) return res.json({ success: false, errMsg: '缺少openid' })
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('boss_openid', ?)").run(openid)
  res.json({ success: true })
})

// 老板通过 wx.login() 的 code 绑定 openid
app.post('/api/bind-boss', (req, res) => {
  const { code } = req.body
  if (!code) return res.json({ success: false, errMsg: '缺少code' })
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
  https.get(url, response => {
    let data = ''
    response.on('data', c => data += c)
    response.on('end', () => {
      try {
        const json = JSON.parse(data)
        if (json.openid) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('boss_openid', ?)").run(json.openid)
          res.json({ success: true, openid: json.openid })
        } else {
          res.json({ success: false, errMsg: '获取openid失败: ' + data })
        }
      } catch (e) {
        res.json({ success: false, errMsg: '解析失败' })
      }
    })
  }).on('error', () => res.json({ success: false, errMsg: '请求微信失败' }))
})

// 登录：用 code 换 openid，返回身份
app.post('/api/login', (req, res) => {
  const { code } = req.body
  if (!code) return res.json({ success: false, errMsg: '缺少code' })
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
  https.get(url, response => {
    let data = ''
    response.on('data', c => data += c)
    response.on('end', () => {
      try {
        const json = JSON.parse(data)
        if (json.openid) {
          const bossOpenid = getBossOpenid()
          const role = (bossOpenid && json.openid === bossOpenid) ? 'boss' : 'user'
          // 自动注册用户
          if (role === 'user') {
            db.prepare("INSERT OR IGNORE INTO users (openid) VALUES (?)").run(json.openid)
          }
          const user = db.prepare('SELECT * FROM users WHERE openid = ?').get(json.openid)
          res.json({ success: true, openid: json.openid, role, nickname: user ? user.nickname : '' })
        } else {
          res.json({ success: false, errMsg: '登录失败' })
        }
      } catch (e) {
        res.json({ success: false, errMsg: '解析失败' })
      }
    })
  }).on('error', () => res.json({ success: false, errMsg: '请求微信失败' }))
})

// 获取/更新用户信息
app.get('/api/user-info', (req, res) => {
  const { openid } = req.query
  if (!openid) return res.json({ success: false, errMsg: '缺少openid' })
  let user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid)
  if (!user) {
    db.prepare("INSERT OR IGNORE INTO users (openid) VALUES (?)").run(openid)
    user = { openid, nickname: '', avatar: '' }
  }
  res.json({ success: true, data: user })
})

app.put('/api/user-info', (req, res) => {
  const { openid, nickname, avatar } = req.body
  if (!openid) return res.json({ success: false, errMsg: '缺少openid' })
  const fields = [], params = []
  if (nickname !== undefined) { fields.push('nickname = ?'); params.push(nickname.trim()) }
  if (avatar !== undefined) { fields.push('avatar = ?'); params.push(avatar) }
  if (!fields.length) return res.json({ success: false, errMsg: '没有要更新的字段' })
  params.push(openid)
  db.prepare('UPDATE users SET ' + fields.join(', ') + ' WHERE openid = ?').run(...params)
  res.json({ success: true })
})

// 用户自己的订单
app.get('/api/my-orders', (req, res) => {
  const { openid } = req.query
  if (!openid) return res.json({ success: false, errMsg: '缺少openid' })
  const orders = db.prepare('SELECT * FROM orders WHERE user_openid = ? ORDER BY created_at DESC').all(openid)
  const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?')
  res.json({ success: true, data: orders.map(o => ({ ...o, items: itemStmt.all(o.id) })) })
})

// 老板备注订单（如送达时间）
app.put('/api/orders/:id/remark', (req, res) => {
  const { remark } = req.body
  if (!remark) return res.json({ success: false, errMsg: '缺少备注内容' })
  db.prepare('UPDATE orders SET remark = ? WHERE id = ?').run(remark.trim(), req.params.id)
  res.json({ success: true })
})

// ---- 评价 ----

// 提交/更新评价
app.post('/api/reviews', (req, res) => {
  const { user_openid, product_id, rating, content } = req.body
  if (!user_openid || !product_id || !rating) {
    return res.json({ success: false, errMsg: '缺少必要参数' })
  }
  const r = parseInt(rating)
  if (r < 1 || r > 5) return res.json({ success: false, errMsg: '评分范围1-5' })

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id)
  if (!product) return res.json({ success: false, errMsg: '商品不存在' })

  db.prepare(
    'INSERT INTO reviews (user_openid, product_id, rating, content) VALUES (?, ?, ?, ?) ON CONFLICT(user_openid, product_id) DO UPDATE SET rating = excluded.rating, content = excluded.content'
  ).run(user_openid, product_id, r, content || '')

  // 更新商品的平均评分和评价数量
  const stats = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as cnt FROM reviews WHERE product_id = ?').get(product_id)
  db.prepare('UPDATE products SET rating = ?, review_count = ? WHERE id = ?').run(
    Math.round(stats.avg_rating * 10) / 10, stats.cnt, product_id
  )

  // 通知老板有新评价
  const reviewProduct = db.prepare('SELECT name FROM products WHERE id = ?').get(product_id)
  const bossOpenid = getBossOpenid()
  if (bossOpenid && reviewProduct) {
    const stars = '★'.repeat(r) + '☆'.repeat(5 - r)
    const reviewText = content ? `${stars} ${content}` : stars
    const now = new Date()
    const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    sendSubscribeMessage(bossOpenid, {
      time5: { value: timeStr },
      character_string6: { value: String(r) + '星' },
      thing4: { value: '商品评价' },
      thing10: { value: reviewProduct.name },
      time19: { value: timeStr }
    }).catch(err => console.error('评价通知失败:', err.message))
  }

  res.json({ success: true, data: { rating: Math.round(stats.avg_rating * 10) / 10, review_count: stats.cnt } })
})

// 获取商品评价列表
app.get('/api/reviews', (req, res) => {
  const { product_id } = req.query
  if (!product_id) return res.json({ success: false, errMsg: '缺少product_id' })
  const reviews = db.prepare(
    'SELECT r.*, u.nickname FROM reviews r LEFT JOIN users u ON r.user_openid = u.openid WHERE r.product_id = ? ORDER BY r.created_at DESC'
  ).all(product_id)
  res.json({ success: true, data: reviews })
})

// 获取用户对某商品的评价
app.get('/api/my-review', (req, res) => {
  const { openid, product_id } = req.query
  if (!openid || !product_id) return res.json({ success: false, errMsg: '缺少参数' })
  const review = db.prepare('SELECT * FROM reviews WHERE user_openid = ? AND product_id = ?').get(openid, product_id)
  res.json({ success: true, data: review || null })
})

app.get('/', (req, res) => {
  res.send('橙树下的哈基猫 API 运行中')
})

app.listen(PORT, '0.0.0.0', () => {
  console.log('橙树下的哈基猫 后端服务已启动: http://0.0.0.0:' + PORT)
})

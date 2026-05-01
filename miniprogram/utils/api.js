// 服务器地址
const BASE_URL = 'https://twosmallcats.asia'

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(new Error('请求失败: ' + res.statusCode))
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

const api = {
  // 登录 & 身份
  login(code) {
    return request({ url: '/api/login', method: 'POST', data: { code } })
  },
  getUserInfo(openid) {
    return request({ url: '/api/user-info', data: { openid } })
  },
  updateUserInfo(data) {
    return request({ url: '/api/user-info', method: 'PUT', data })
  },
  registerBoss(code) {
    return request({ url: '/api/bind-boss', method: 'POST', data: { code } })
  },

  // 类目
  getCategories() {
    return request({ url: '/api/categories' })
  },
  addCategory(name) {
    return request({ url: '/api/categories', method: 'POST', data: { name } })
  },
  deleteCategory(id) {
    return request({ url: '/api/categories/' + id, method: 'DELETE' })
  },

  // 商品
  getProducts(params) {
    return request({ url: '/api/products', data: params })
  },
  addProduct(data) {
    return request({ url: '/api/products', method: 'POST', data })
  },
  updateProduct(id, data) {
    return request({ url: '/api/products/' + id, method: 'PUT', data })
  },
  deleteProduct(id) {
    return request({ url: '/api/products/' + id, method: 'DELETE' })
  },

  // 订单
  getOrders(limit) {
    return request({ url: '/api/orders', data: { limit } })
  },
  getMyOrders(openid) {
    return request({ url: '/api/my-orders', data: { openid } })
  },
  createOrder(items, user_openid, remark) {
    return request({ url: '/api/orders', method: 'POST', data: { items, user_openid, remark: remark || '' } })
  },
  updateOrderStatus(id, status) {
    return request({ url: '/api/orders/' + id + '/status', method: 'PUT', data: { status } })
  },
  remarkOrder(id, remark) {
    return request({ url: '/api/orders/' + id + '/remark', method: 'PUT', data: { remark } })
  },

  // 图片上传
  uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: BASE_URL + '/api/upload',
        filePath: filePath,
        name: 'file',
        success(res) {
          const data = JSON.parse(res.data)
          if (data.success) {
            resolve(BASE_URL + data.url)
          } else {
            reject(new Error(data.errMsg || '上传失败'))
          }
        },
        fail(err) {
          reject(err)
        }
      })
    })
  },

  // 评价
  submitReview(data) {
    return request({ url: '/api/reviews', method: 'POST', data })
  },
  getReviews(product_id) {
    return request({ url: '/api/reviews', data: { product_id } })
  },
  getMyReview(openid, product_id) {
    return request({ url: '/api/my-review', data: { openid, product_id } })
  }
}

module.exports = api

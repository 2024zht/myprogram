const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    categories: [],
    products: [],
    activeIndex: 0,
    loading: false,
    cart: [],
    cartCount: 0,
    showCart: false,
    subscribed: false,
    role: '',
    userTab: 'home',
    showRating: false,
    ratingProductId: null,
    ratingProductName: '',
    ratingValue: 5,
    ratingContent: '',
    remark: '',
    cartTotal: 0
  },

  onLoad() {
    // TODO: 测试完后删除下面这行
    this.setData({ role: 'user' })
    wx.hideTabBar()
    this.initRole()
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
    if (this.data.role === 'user') {
      wx.hideTabBar()
    }
  },

  initRole() {
    const role = app.globalData.role
    if (role) {
      this.applyRole(role)
    } else {
      app._roleReadyCallback = (r) => this.applyRole(r)
    }
  },

  applyRole(role) {
    // TODO: 测试完后恢复原逻辑
    role = 'user'
    this.setData({ role })
    if (role === 'user') {
      wx.hideTabBar()
    }
  },

  onPullDownRefresh() {
    this.loadCategories()
    wx.stopPullDownRefresh()
  },

  loadCategories() {
    api.getCategories().then(res => {
      const categories = res.data || []
      this.setData({ categories })
      if (categories.length > 0) {
        this.loadProducts(categories[this.data.activeIndex].id)
      }
    })
  },

  loadProducts(categoryId) {
    this.setData({ loading: true })
    api.getProducts({ category_id: categoryId }).then(res => {
      this.setData({ products: res.data || [], loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onTapCategory(e) {
    const index = e.currentTarget.dataset.index
    const id = e.currentTarget.dataset.id
    this.setData({ activeIndex: index })
    this.loadProducts(id)
  },

  // 加入购物车
  onAddToCart(e) {
    const id = e.currentTarget.dataset.id
    const product = this.data.products.find(p => p.id === id)
    if (!product) return

    const cart = [...this.data.cart]
    const exist = cart.find(c => c.product_id === id)
    if (exist) {
      exist.quantity++
    } else {
      cart.push({
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1
      })
    }
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0)
    const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)
    this.setData({ cart, cartCount, cartTotal })
    wx.showToast({ title: '已加入', icon: 'success', duration: 800 })
  },

  // 切换购物车面板
  onToggleCart() {
    this.setData({ showCart: !this.data.showCart })
  },

  onCloseCart() {
    this.setData({ showCart: false })
  },

  // 数量操作
  onCartMinus(e) {
    const id = e.currentTarget.dataset.id
    const cart = [...this.data.cart]
    const idx = cart.findIndex(c => c.product_id === id)
    if (idx < 0) return
    if (cart[idx].quantity > 1) {
      cart[idx].quantity--
    } else {
      cart.splice(idx, 1)
    }
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0)
    const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)
    this.setData({ cart, cartCount, cartTotal })
  },

  onCartPlus(e) {
    const id = e.currentTarget.dataset.id
    const cart = [...this.data.cart]
    const item = cart.find(c => c.product_id === id)
    if (!item) return
    item.quantity++
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0)
    const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0).toFixed(2)
    this.setData({ cart, cartCount, cartTotal })
  },

  // 清空购物车
  onClearCart() {
    this.setData({ cart: [], cartCount: 0, cartTotal: 0, showCart: false })
  },

  // 请求订阅消息授权
  requestSubscribe() {
    if (this.data.subscribed) return
    wx.requestSubscribeMessage({
      tmplIds: ['OFLne64NGuvM9_2CDLRDtM1iYnflt41Hed2yE1KUqxE'],
      success: () => {
        this.setData({ subscribed: true })
      },
      fail: () => {}
    })
  },

  // 一键下单
  onPlaceOrder() {
    const { cart } = this.data
    if (!cart.length) return

    this.requestSubscribe()

    wx.showLoading({ title: '下单中...' })
    api.createOrder(cart.map(c => ({
      product_id: c.product_id,
      name: c.name,
      price: c.price,
      quantity: c.quantity
    })), app.globalData.openid, this.data.remark).then(() => {
      wx.hideLoading()
      this.setData({ cart: [], cartCount: 0, cartTotal: 0, showCart: false, remark: '' })
      wx.showToast({ title: '下单成功！', icon: 'success' })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '下单失败', icon: 'none' })
    })
  },

  // 用户底部导航
  onUserTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.userTab) return
    if (tab === 'orders') {
      wx.navigateTo({ url: '/pages/myOrders/myOrders' })
    } else if (tab === 'profile') {
      wx.navigateTo({ url: '/pages/profile/profile' })
    }
  },

  // 备注输入
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  // 打开评价面板
  onOpenRating(e) {
    const id = e.currentTarget.dataset.id
    const product = this.data.products.find(p => p.id === id)
    if (!product) return
    // 查看用户是否已评价过
    const openid = app.globalData.openid
    if (openid) {
      api.getMyReview(openid, id).then(res => {
        this.setData({
          showRating: true,
          ratingProductId: id,
          ratingProductName: product.name,
          ratingValue: res.data ? res.data.rating : 5
        })
      }).catch(() => {
        this.setData({
          showRating: true,
          ratingProductId: id,
          ratingProductName: product.name,
          ratingValue: 5
        })
      })
    } else {
      this.setData({
        showRating: true,
        ratingProductId: id,
        ratingProductName: product.name,
        ratingValue: 5
      })
    }
  },

  onCloseRating() {
    this.setData({ showRating: false })
  },

  onSelectStar(e) {
    this.setData({ ratingValue: parseInt(e.currentTarget.dataset.value) })
  },

  onContentInput(e) {
    this.setData({ ratingContent: e.detail.value })
  },

  onSubmitRating() {
    const { ratingProductId, ratingValue, ratingContent } = this.data
    const openid = app.globalData.openid
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    wx.showLoading({ title: '提交中...' })
    api.submitReview({
      user_openid: openid,
      product_id: ratingProductId,
      rating: ratingValue,
      content: ratingContent
    }).then(res => {
      wx.hideLoading()
      this.setData({ showRating: false, ratingContent: '' })
      wx.showToast({ title: '评价成功', icon: 'success' })
      // 更新本地商品数据
      const products = this.data.products.map(p => {
        if (p.id === ratingProductId) {
          return { ...p, rating: res.data.rating, review_count: res.data.review_count }
        }
        return p
      })
      this.setData({ products })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '评价失败', icon: 'none' })
    })
  }
})

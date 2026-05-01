const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    orders: [],
    loading: true,
    showRating: false,
    ratingProductId: null,
    ratingProductName: '',
    ratingValue: 5,
    ratingContent: ''
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    this.loadOrders()
  },

  onPullDownRefresh() {
    this.loadOrders()
    wx.stopPullDownRefresh()
  },

  loadOrders() {
    this.setData({ loading: true })
    api.getMyOrders(app.globalData.openid).then(res => {
      const orders = (res.data || []).map(o => ({
        ...o,
        statusText: this.getStatusText(o.status)
      }))
      this.setData({ orders, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  getStatusText(status) {
    const map = { pending: '待处理', accepted: '已接单', rejected: '已拒绝', done: '已完成', cancelled: '已取消' }
    return map[status] || status
  },

  onCancelOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认撤回',
      content: '确定要撤回该订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '撤回中...' })
          api.updateOrderStatus(id, 'cancelled').then(() => {
            wx.hideLoading()
            wx.showToast({ title: '已撤回', icon: 'success' })
            this.loadOrders()
          }).catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '操作失败', icon: 'none' })
          })
        }
      }
    })
  },

  // 打开评价面板
  onOpenRating(e) {
    const productId = e.currentTarget.dataset.productId
    const name = e.currentTarget.dataset.name
    const openid = app.globalData.openid
    if (openid) {
      api.getMyReview(openid, productId).then(res => {
        this.setData({
          showRating: true,
          ratingProductId: productId,
          ratingProductName: name,
          ratingValue: res.data ? res.data.rating : 5
        })
      }).catch(() => {
        this.setData({
          showRating: true,
          ratingProductId: productId,
          ratingProductName: name,
          ratingValue: 5
        })
      })
    } else {
      this.setData({
        showRating: true,
        ratingProductId: productId,
        ratingProductName: name,
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
    }).then(() => {
      wx.hideLoading()
      this.setData({ showRating: false, ratingContent: '' })
      wx.showToast({ title: '评价成功', icon: 'success' })
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '评价失败', icon: 'none' })
    })
  }
})

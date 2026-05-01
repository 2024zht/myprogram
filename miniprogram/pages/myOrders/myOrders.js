const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    orders: [],
    loading: true
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
  }
})

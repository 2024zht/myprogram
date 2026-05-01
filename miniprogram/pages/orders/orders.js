const api = require('../../utils/api')

Page({
  data: {
    orders: [],
    loading: false
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
    api.getOrders(50).then(res => {
      const orders = (res.data || []).map(order => {
        const statusText = this.getStatusText(order.status)
        return { ...order, statusText }
      })
      this.setData({ orders, loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  getStatusText(status) {
    const map = { pending: '待处理', accepted: '已接单', rejected: '已拒绝', done: '已完成', cancelled: '已取消' }
    return map[status] || status
  },

  onTapOrder(e) {
    const id = e.currentTarget.dataset.id
    wx.showActionSheet({
      itemList: ['标记已接单', '标记已完成', '添加备注', '拒绝订单'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.updateOrderStatus(id, 'accepted')
        } else if (res.tapIndex === 1) {
          this.updateOrderStatus(id, 'done')
        } else if (res.tapIndex === 2) {
          this.addRemark(id)
        } else if (res.tapIndex === 3) {
          this.rejectOrder(id)
        }
      }
    })
  },

  updateOrderStatus(id, status) {
    wx.showLoading({ title: '更新中...' })
    api.updateOrderStatus(id, status).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '更新成功', icon: 'success' })
      this.loadOrders()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '更新失败', icon: 'none' })
    })
  },

  addRemark(id) {
    wx.showModal({
      title: '添加备注',
      placeholderText: '如：预计30分钟送达',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          wx.showLoading({ title: '提交中...' })
          api.remarkOrder(id, res.content.trim()).then(() => {
            wx.hideLoading()
            wx.showToast({ title: '备注成功', icon: 'success' })
            this.loadOrders()
          }).catch(() => {
            wx.hideLoading()
            wx.showToast({ title: '操作失败', icon: 'none' })
          })
        }
      }
    })
  },

  rejectOrder(id) {
    wx.showModal({
      title: '确认拒绝',
      content: '确定要拒绝这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateOrderStatus(id, 'rejected')
        }
      }
    })
  }
})

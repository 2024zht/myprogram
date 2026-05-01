const api = require('../../utils/api')

Page({
  data: {
    categoryId: '',
    categoryName: '',
    keyword: '',
    products: [],
    loading: false
  },

  onLoad(options) {
    if (options.categoryId) {
      this.setData({ categoryId: options.categoryId, categoryName: decodeURIComponent(options.categoryName || '') })
      wx.setNavigationBarTitle({ title: this.data.categoryName || '商品列表' })
    }
    if (options.keyword) {
      this.setData({ keyword: options.keyword })
      wx.setNavigationBarTitle({ title: '搜索: ' + options.keyword })
    }
    this.loadProducts()
  },

  onPullDownRefresh() {
    this.loadProducts()
    wx.stopPullDownRefresh()
  },

  loadProducts() {
    this.setData({ loading: true })
    const params = {}
    if (this.data.categoryId) params.category_id = this.data.categoryId
    if (this.data.keyword) params.keyword = this.data.keyword
    api.getProducts(params).then(res => {
      this.setData({ products: res.data || [], loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onAddProduct() {
    let url = '/pages/addProduct/addProduct'
    if (this.data.categoryId) {
      url += '?categoryId=' + this.data.categoryId + '&categoryName=' + encodeURIComponent(this.data.categoryName)
    }
    wx.navigateTo({ url })
  },

  onDeleteProduct(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '确认删除',
      content: '确定要删除商品「' + name + '」吗？',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteProduct(id)
        }
      }
    })
  },

  doDeleteProduct(id) {
    wx.showLoading({ title: '删除中...' })
    api.deleteProduct(id).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })
      this.loadProducts()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '删除失败', icon: 'none' })
    })
  },

  onEditProduct(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/addProduct/addProduct?id=' + id })
  }
})

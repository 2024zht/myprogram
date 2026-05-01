const api = require('../../utils/api')

Page({
  data: {
    categories: [],
    loading: false
  },

  onLoad() {
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
  },

  onPullDownRefresh() {
    this.loadCategories()
    wx.stopPullDownRefresh()
  },

  loadCategories() {
    this.setData({ loading: true })
    api.getCategories().then(res => {
      this.setData({ categories: res.data || [], loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onTapCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    wx.navigateTo({
      url: '/pages/productList/productList?categoryId=' + id + '&categoryName=' + encodeURIComponent(name)
    })
  },

  onAddCategory() {
    wx.showModal({
      title: '新增类目',
      editable: true,
      placeholderText: '请输入类目名称',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          this.addCategory(res.content.trim())
        }
      }
    })
  },

  addCategory(name) {
    wx.showLoading({ title: '添加中...' })
    api.addCategory(name).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.loadCategories()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '添加失败', icon: 'none' })
    })
  },

  onEditCategory() {
    wx.navigateTo({ url: '/pages/editCategory/editCategory' })
  }
})

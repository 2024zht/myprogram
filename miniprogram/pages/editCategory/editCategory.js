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

  loadCategories() {
    this.setData({ loading: true })
    api.getCategories().then(res => {
      this.setData({ categories: res.data || [], loading: false })
    }).catch(() => {
      this.setData({ loading: false })
    })
  },

  onAddCategory() {
    wx.showModal({
      title: '新增类目',
      editable: true,
      placeholderText: '请输入类目名称',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          this.doAddCategory(res.content.trim())
        }
      }
    })
  },

  doAddCategory(name) {
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

  onDeleteCategory(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '确认删除',
      content: '确定要删除类目「' + name + '」吗？该类目下的商品也将被删除。',
      success: (res) => {
        if (res.confirm) {
          this.doDeleteCategory(id)
        }
      }
    })
  },

  doDeleteCategory(id) {
    wx.showLoading({ title: '删除中...' })
    api.deleteCategory(id).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '删除成功', icon: 'success' })
      this.loadCategories()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '删除失败', icon: 'none' })
    })
  }
})

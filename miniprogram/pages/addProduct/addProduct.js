const api = require('../../utils/api')

Page({
  data: {
    categories: [],
    formData: {
      name: '',
      description: '',
      categoryId: '',
      categoryName: '',
      price: '',
      stock: '',
      image: ''
    },
    categoryIndex: -1,
    uploading: false
  },

  onLoad(options) {
    this.loadCategories()
    if (options.categoryId) {
      const formData = { ...this.data.formData }
      formData.categoryId = options.categoryId
      formData.categoryName = decodeURIComponent(options.categoryName || '')
      this.setData({ formData })
    }
  },

  loadCategories() {
    api.getCategories().then(res => {
      this.setData({ categories: res.data || [] })
    })
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const formData = { ...this.data.formData }
    formData[field] = e.detail.value
    this.setData({ formData })
  },

  onCategoryChange(e) {
    const index = parseInt(e.detail.value)
    const category = this.data.categories[index]
    const formData = { ...this.data.formData }
    formData.categoryId = category.id
    formData.categoryName = category.name
    this.setData({ formData, categoryIndex: index })
  },

  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.uploadImage(tempFilePath)
      }
    })
  },

  uploadImage(filePath) {
    this.setData({ uploading: true })
    api.uploadImage(filePath).then(url => {
      const formData = { ...this.data.formData }
      formData.image = url
      this.setData({ formData, uploading: false })
      wx.showToast({ title: '图片上传成功', icon: 'success' })
    }).catch(() => {
      this.setData({ uploading: false })
      wx.showToast({ title: '图片上传失败', icon: 'none' })
    })
  },

  onSubmit() {
    const { name, description, categoryId, price, stock, image } = this.data.formData
    if (!name.trim()) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    if (!categoryId) {
      wx.showToast({ title: '请选择所属类目', icon: 'none' })
      return
    }

    wx.showLoading({ title: '添加中...' })
    api.addProduct({
      name: name.trim(),
      description: description.trim(),
      category_id: categoryId,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      image: image
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '添加成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '添加失败', icon: 'none' })
    })
  }
})

const api = require('../../utils/api')

Page({
  data: {
    shopName: '橙树下的哈基猫',
    shopAvatar: 'https://twosmallcats.asia/uploads/1777562988083.png',
    shopBanner: 'https://twosmallcats.asia/uploads/1777562988083.png',
    bossBound: false
  },

  onEnterShop() {
    wx.switchTab({ url: '/pages/products/products' })
  },

  onManageShop() {
    wx.showActionSheet({
      itemList: ['编辑类目', '添加商品'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.navigateTo({ url: '/pages/editCategory/editCategory' })
        } else {
          wx.navigateTo({ url: '/pages/addProduct/addProduct' })
        }
      }
    })
  },

  // 老板注册接收订单通知
  onBindBoss() {
    wx.showLoading({ title: '绑定中...' })
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.hideLoading()
          wx.showToast({ title: '登录失败', icon: 'none' })
          return
        }
        api.registerBoss(loginRes.code).then(res => {
          wx.hideLoading()
          if (res.success) {
            this.setData({ bossBound: true })
            wx.showToast({ title: '绑定成功！', icon: 'success' })
          } else {
            wx.showToast({ title: res.errMsg || '绑定失败', icon: 'none' })
          }
        }).catch(() => {
          wx.hideLoading()
          wx.showToast({ title: '网络错误', icon: 'none' })
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '登录失败', icon: 'none' })
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '橙树下的哈基猫 - 点单小程序',
      path: '/pages/home/home'
    }
  }
})

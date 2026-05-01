const api = require('../../utils/api')
const app = getApp()

Page({
  data: {
    openid: '',
    nickname: '',
    editing: false,
    editNickname: ''
  },

  onLoad() {
    this.setData({ openid: app.globalData.openid || '', nickname: app.globalData.nickname || '' })
    this.loadUserInfo()
  },

  loadUserInfo() {
    if (!this.data.openid) return
    api.getUserInfo(this.data.openid).then(res => {
      if (res.success && res.data) {
        const nickname = res.data.nickname || ''
        this.setData({ nickname })
        app.globalData.nickname = nickname
      }
    })
  },

  onEditNickname() {
    this.setData({ editing: true, editNickname: this.data.nickname })
  },

  onNicknameInput(e) {
    this.setData({ editNickname: e.detail.value })
  },

  onSaveNickname() {
    const nickname = this.data.editNickname.trim()
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    api.updateUserInfo({ openid: this.data.openid, nickname }).then(res => {
      if (res.success) {
        this.setData({ nickname, editing: false })
        app.globalData.nickname = nickname
        wx.showToast({ title: '保存成功', icon: 'success' })
      }
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' })
    })
  },

  onCancelEdit() {
    this.setData({ editing: false })
  },

  onGoOrders() {
    wx.navigateTo({ url: '/pages/myOrders/myOrders' })
  }
})

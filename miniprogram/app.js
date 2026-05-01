// app.js
const api = require('./utils/api')

App({
  onLaunch() {
    this.globalData = {}
    this.login()
  },

  login() {
    return new Promise((resolve) => {
      wx.login({
        success: (res) => {
          if (!res.code) { resolve(); return }
          api.login(res.code).then(result => {
            if (result.success) {
              this.globalData.openid = result.openid
              this.globalData.role = result.role
              this.globalData.nickname = result.nickname || ''
              if (this._roleReadyCallback) this._roleReadyCallback(result.role)
            }
            resolve()
          }).catch(() => resolve())
        },
        fail: () => resolve()
      })
    })
  },

  globalData: {}
})

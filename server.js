const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const https = require('https')
const fs = require('fs')
const path = require('path')
const AlipaySdk = require('alipay-sdk').default
const crypto = require('crypto')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID || '2021006185601029',
  privateKey: process.env.ALIPAY_PRIVATE_KEY || 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDKG0shUvg9OCKnZLCFOaLE3tM4nN2f9Afue94EwaW2QoOQfAe/3OZNHYztlO1KmyDgD0yT81iHoD4b0CpzhKvADRk+/L+T2gyiS92dHlsFhF3lZGi0UQ67bVbzPydcKUBxat4wjlr0KEKb1jAwk5yTEgZozUN4N9cAC6EZ4WHTrgsqbsh5DI8aXvUSpLq4LWj3zJZSi2Mb066O1AT+yH/XD3jf2RYLR9dzjvJ6TFsrd9Kp30CNIM3dnk2nTeFyoH8KkaN+Mi5I51y7ILSMgtlt1aUkrAQCQuIxdWl5KwLrEZuXScbuLYMdgp/yJAwn8J26Vu6LOL/GcHBzMrTuR8i3AgMBAAECggEAV4USN9ASJ5CTkSGNP2QCFHbZyP5FCutGNAP31N92v0J2bq8HPBKQuHw/dvKy/0fGKMD3TGpov/KocqrmdzfQmE4TzK7u1zvplK59vXhTukPj1V5x6QPg+VEUAiorBUHn4jWBGk3LHUgB8DIElESX3ShFFkUtHnYv6JkgnnB3SI6kJcYecHFp73HpM7eec+r/yIkvmR3rYOTA94ckOjhSGC93fsXHsMPog1ErxtEUrzkoIcVwle8Ymhp+rxh+6ALkMZ8/Cg2hnSuPm42gUTBnhy6FP9Bv0Z0F+1oQrkBsmaq8KZ4APNqifpEzvL28sGZiTdOkpM8oDfRAReL8jZBbIQKBgQD213lNm3O/iexGxWS5OHdWp5rNrprxzL55uyjSzwcgtOSKRGXQCU9MlgXP0e/vfX59OWeNekcykNc1PHSKjs60SXhjpWsX/7iCs5A5qPIBD8oYPWx4EiGiNOcAwVn/WDgXYtx6EYhmwFaHxbVtG3mRisSdMa2jw+6QN+8TMApovQKBgQDRmuvqlnHt5riHf8sLmx7IkP0RLhUiHsSntWUp4B41BYE01pOnFKoyi1OGrSbztHz3PVNYC4c+xoaS+QS6SmI5s3b722fVkOcmdWwTIOX0n4PX0vR/+fj8gqK5CHw7cgVyjsGSCnqcxJ8Q8I8ndFpNWPnQY7hiW/ODaPNKtX/wgwKBgQCREoB7aRJ1DuVrjpWs+g/BQQ4NNkJgPBnyR1ot03j38viifqJryxztAPr3cgYW9eWCSVuf3a68fD3PTvGbgWTgtpFn1w+C8ksJnej0ymM41oPLDUaTpuxXfcoKOpjfJoUI0ZSMtYM6CG6Sq1L+hfhD3o/BZzILHps17Xm4CDMF7QKBgAb8KrB+ov1SmwOo9pNEcBou+r//0SR58gPEv8JNfbQ2or+oBvOidKmKixYJ3ypv8Vor6QMeHzuwUfvD4Kx0niFeIbDy9trfIVTexOM+TWuBhVtD5HH/WpTPpayU4873VccjjFhzFjlXh9pd7NmguGJtxyoiBFdM38gNpVkIK9EOY9bCGXg+bOV4cs/isArfzM6vUFr+mOoi4/OsmjVcS7cqOYYPbu5NVNb72Kfk6zX0TC1GLYMyV2OiJoeVi+pgi2BgRBoRr1SbSbFW8c5KAi4628=',
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm2m+Wk3RjmpMM5E6ArDUGxHAboBRyEzttvUFD2m8cyGabuvulSf0oHu+3NZYWk9Mtmb9+QMf3e/v2YfzzoxKp0CUjT9IxvSoT2Ue3oThWi1BFOS7tuy+Wcr/lvtU5ZC8+LcTFw+8WEC4VL6FDzPXgdytEOW84SN3EgKs1wvqx7+5fs0h+YQBAxme6kiQAyVwTnx67SxcAG7uh4oxYsfDI7kffyNSFY0JWLq6CLBIcTcbMaJgYQRClcH3z0miUBG0cOQ5oopD1LvZV6us1tTzpyq3Dc4n9P81zHBNxVWBray+nC2QuFIvnfyTsS7WlANFCR92vMDRzjASTY/GoPjJJQIDAQAB',
  gateway: 'https://openapi.alipay.com/gateway.do',
  signType: 'RSA2',
  keyType: 'PKCS8',
  charset: 'utf-8'
})

const orders = new Map()

let HOST_IP = '192.168.1.106'
try {
  const nets = require('os').networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        HOST_IP = net.address
        break
      }
    }
  }
} catch (e) {}

const certOptions = {}
const keyPath = path.join(__dirname, 'server.key')
const certPath = path.join(__dirname, 'server.crt')
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  certOptions.key = fs.readFileSync(keyPath)
  certOptions.cert = fs.readFileSync(certPath)
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.post('/api/alipay/precreate', async (req, res) => {
  try {
    const { orderNo, amount, subject } = req.body

    if (!orderNo || !amount) {
      return res.status(400).json({ error: '缺少订单号或金额' })
    }

    const orderSubject = subject || '商品购买'
    const totalAmount = parseFloat(amount).toFixed(2)

    const bizContent = {
      out_trade_no: orderNo,
      total_amount: totalAmount,
      subject: orderSubject,
      product_code: 'FACE_TO_FACE_PAYMENT',
      timeout_express: '30m'
    }

    const response = await alipaySdk.exec('alipay.trade.precreate', {
      bizContent: bizContent
    })

    console.log('Precreate response:', JSON.stringify(response))

    if (response && response.code === '10000') {
      const qrCode = response.qr_code || response.qrCode || ''
      const tradeNo = response.trade_no || response.tradeNo || ''

      orders.set(orderNo, {
        tradeNo,
        amount: totalAmount,
        subject: orderSubject,
        status: 'WAIT_BUYER_PAY',
        qrCode,
        createdAt: new Date().toISOString()
      })

      res.json({
        success: true,
        qrCode,
        tradeNo,
        orderNo
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '预下单失败',
        code: response ? response.code : undefined
      })
    }
  } catch (error) {
    console.error('Precreate error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/alipay/notify', (req, res) => {
  try {
    const params = req.body

    if (!params.sign) {
      return res.json('success')
    }

    const verifyParams = { ...params }
    delete verifyParams['sign']
    delete verifyParams['sign_type']

    const sortedKeys = Object.keys(verifyParams).sort()
    const sortedStr = sortedKeys.map(k => `${k}=${verifyParams[k]}`).join('&')

    const signVerified = alipaySdk.checkNotifySign(params)

    if (!signVerified) {
      console.error('签名验证失败')
      return res.json('failure')
    }

    const orderNo = params.out_trade_no
    const tradeStatus = params.trade_status
    const tradeNo = params.trade_no
    const totalAmount = params.total_amount

    const order = orders.get(orderNo)
    if (!order) {
      console.error('订单不存在:', orderNo)
      return res.json('failure')
    }

    order.status = tradeStatus
    order.tradeNo = tradeNo
    order.paidAt = new Date().toISOString()

    console.log('支付回调处理成功:', {
      orderNo,
      tradeStatus,
      tradeNo,
      totalAmount
    })

    res.json('success')
  } catch (error) {
    console.error('Notify error:', error)
    res.json('failure')
  }
})

app.get('/api/order/:orderNo', (req, res) => {
  const orderNo = req.params.orderNo
  const order = orders.get(orderNo)

  if (!order) {
    return res.status(404).json({ error: '订单不存在' })
  }

  res.json({ success: true, order })
})

app.post('/api/alipay/query', async (req, res) => {
  try {
    const { orderNo } = req.body

    if (!orderNo) {
      return res.status(400).json({ error: '缺少订单号' })
    }

    const response = await alipaySdk.exec('alipay.trade.query', {
      bizContent: { out_trade_no: orderNo }
    })

    console.log('Query response:', JSON.stringify(response))

    if (response && response.code === '10000') {
      res.json({
        success: true,
        status: response.tradeStatus,
        tradeNo: response.tradeNo,
        totalAmount: response.totalAmount,
        buyerLogonId: response.buyerLogonId
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '查询失败'
      })
    }
  } catch (error) {
    console.error('Query error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/alipay/refund', async (req, res) => {
  try {
    const { orderNo, refundAmount, refundReason } = req.body

    if (!orderNo || !refundAmount) {
      return res.status(400).json({ error: '缺少订单号或退款金额' })
    }

    const order = orders.get(orderNo)
    if (!order) {
      return res.status(404).json({ error: '订单不存在' })
    }

    const refundNo = 'REFUND_' + Date.now()

    const response = await alipaySdk.exec('alipay.trade.refund', {
      bizContent: {
        out_trade_no: orderNo,
        refund_amount: parseFloat(refundAmount).toFixed(2),
        refund_reason: refundReason || '用户申请退款',
        out_request_no: refundNo
      }
    })

    console.log('Refund response:', JSON.stringify(response))

    if (response && response.code === '10000') {
      res.json({
        success: true,
        refundId: response.refundId,
        refundNo
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '退款失败'
      })
    }
  } catch (error) {
    console.error('Refund error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`)
  console.log(`  支付宝商城后端服务已启动`)
  console.log(`  HTTP 端口: ${PORT}`)
  console.log(`  本地访问: http://localhost:${PORT}`)
  console.log(`  网络访问: http://${HOST_IP}:${PORT}`)
  console.log(`========================================\n`)
  console.log(`  API 接口:`)
  console.log(`  POST /api/alipay/precreate  - 创建支付订单`)
  console.log(`  POST /api/alipay/notify     - 接收支付回调`)
  console.log(`  GET  /api/order/:orderNo    - 查询本地订单`)
  console.log(`  POST /api/alipay/query     - 查询支付宝订单`)
  console.log(`  POST /api/alipay/refund    - 申请退款`)
  console.log(`  GET  /api/health           - 健康检查`)
  console.log(`\n========================================\n`)
})

if (certOptions.key && certOptions.cert) {
  const HTTPS_PORT = 3001
  https.createServer(certOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`  HTTPS 端口: ${HTTPS_PORT} (自签名证书)`)
    console.log(`  网络访问: https://${HOST_IP}:${HTTPS_PORT}`)
    console.log(`  手机需先信任证书: ${HOST_IP}:${HTTPS_PORT}/api/health`)
    console.log(`\n========================================\n`)
  })
}

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
  privateKey: process.env.ALIPAY_PRIVATE_KEY || 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDQ56iKMCJfj3YnZrw6WVfLr/DRqagGQZATc3zeuI0TIaBoKOcoAiTJ/kWgwEx9EEqW/fkzRftB/ocqevn3OkGyFPWO8DAJ+ph5aAAPWgu/aFqDf0larrVfJAF3lyGCudYBHNXPVp2lEFRtnaEWyysqcS6NuiaL6k01KsPDsGUZgySlOuqAAKFWhPvJDR9IzF5WAOCZmLlaEgf5CDmmX+WwQMNx0KnIcMIEKeD0ZsSlWj+SLSN7N5hR89Y1EDFwQLDuRzSBt9ucAGFsiKKQf6DU7h91tHYKmlqECAKDHpE9UIZV4Xcsj328jzOZOtgHxbLSBOgT0xhsHKyNRzcqfD4TAgMBAAECggEAO2GuSeGW070O4/JTDO76gt63QJHOPkECuFS6qQCisU58rz75Pikl1fkeR6yB0YcA/Nyiqo1493BncY7VYQ5BQGKuznu93AhMsS373mFFN5ptKDXVXx6MVcgBVsIx91vl1hkhObewRgxXQ3VsJfOIiJ71kbnZXSoz2ioWzZhllJNrm7zG91NU0dhtfnbr1puUTXlQRzNqkUG7K4uxryFQBm6kp03Ksxx+wbALzAK3oP77KC0E2ht3rgP9tb7Lhqm/5Oj+6VmwqaRM//KNEoADj659Lr5TY/QUUhfze05Bb8W8ArbDWPH5q59VCM/opKRv+/t4AjSPAlYfq5MthPPpEQKBgQD9yyDhAwXwE2xGyAdhSTNkvNfBdSrKOawWfhne1g6L6ekhmFa59Y5TmLfB6TgR8jtZYVdz8gsaP6ppSs5ohrVASldcEXLsHk1IFXWPv1Y1xloFAPcaCMEkLQlCwkUi13Q+zoHal4SdyvHlocahBWEwdCTdVnQJeO9+ElzkSUuKCQKBgQDSuJ7wrrUg28tcwRbAKZLcbFpq7CV2PhcyF2LCnA6TeyMG0BWbNyvJu56R7RgVaZs1FN4G1k2npev7x9qQl1mTiTlTk3RN1tEr43EODEBTRhFusP3Ov8xDdgja8fsMOXwyvqWgWf0VRLLbVCiLiuseDtavCzLD0uGEl3ywS8t+OwKBgH22s7ehtrw/8r9w7+7pwpJg1ILYlfSL8slFd20hHR2DJV7lxffhQbn5CPT9oC+LjIhuplIhkAxVgwUa7/lo2Lla2cEaR5HcRK2zK4Oj5IFImmimHMCBm6JeyJqP/o0Oql8+DaaIrUE4OPBlXS1/q6/DqEsXOu1CQWdykx7li4x5AoGAFpz7aYbGJ02PCFgsUdjkSsVR+rF237aQFK8PySSoJ8mKG7wO5YZJK6/3t19DO2EG5+5iWUd8M+aJaY6r9OJZGY0bWs2zKHtKHTSeOEy2Rnl5e3CA/EP27rJnBt/6+ffdTTDKY2fk0fh6XTEt3LO+wY4EGerQutURoIIFPoITx2sCgYEAhKj8FURWy7jtvRq2WIuph7VbcwU8rGl9hJmoXhD4h/F1XvsHYWgawzZcvLdw5/p0+4LQZHqbCovwtYvAM85rce102x2CmG9r0xR6kQ/ebf7jM05/oln5Z7Go4vIy8NC5nrM+4i9cJosEwR9vrCNncRrw4JFMZLVB/ZYabNC9P78=',
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

// 鐢ㄦ巿鏉冪爜鎹㈠彇 buyer_open_id
app.post('/api/alipay/auth', async (req, res) => {
  try {
    const { authCode } = req.body
    if (!authCode) {
      return res.status(400).json({ error: '缂哄皯鎺堟潈鐮? })
    }

    const response = await alipaySdk.exec('alipay.system.oauth.token', {
      grantType: 'authorization_code',
      code: authCode
    })

    console.log('OAuth response:', JSON.stringify(response))

    if (response && response.code === '10000') {
      res.json({
        success: true,
        openId: response.open_id || response.openId,
        userId: response.user_id || response.userId
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '鎺堟潈澶辫触'
      })
    }
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/alipay/create', async (req, res) => {
  try {
    const { orderNo, amount, subject, buyerOpenId } = req.body

    if (!orderNo || !amount) {
      return res.status(400).json({ error: '缂哄皯璁㈠崟鍙锋垨閲戦' })
    }

    const orderSubject = subject || '鍟嗗搧璐拱'
    const totalAmount = parseFloat(amount).toFixed(2)

    const bizContent = {
      out_trade_no: orderNo,
      total_amount: totalAmount,
      subject: orderSubject,
      product_code: 'JSAPI_PAY',
      timeout_express: '30m',
      notify_url: 'https://alipay-mall-backend.onrender.com/api/alipay/notify'
    }

    // 浼犲叆涔板 open_id
    if (buyerOpenId) {
      bizContent.buyer_open_id = buyerOpenId
    }

    const response = await alipaySdk.exec('alipay.trade.create', {
      bizContent: bizContent
    })

    console.log('Trade create response:', JSON.stringify(response))

    if (response && response.code === '10000') {
      const tradeNo = response.trade_no || response.tradeNo || ''

      orders.set(orderNo, {
        tradeNo,
        amount: totalAmount,
        subject: orderSubject,
        status: 'WAIT_BUYER_PAY',
        createdAt: new Date().toISOString()
      })

      res.json({
        success: true,
        tradeNo,
        orderNo,
        amount: totalAmount
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '鍒涘缓浜ゆ槗澶辫触',
        code: response ? response.code : undefined
      })
    }
  } catch (error) {
    console.error('Create trade error:', error)
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
      console.error('绛惧悕楠岃瘉澶辫触')
      return res.json('failure')
    }

    const orderNo = params.out_trade_no
    const tradeStatus = params.trade_status
    const tradeNo = params.trade_no
    const totalAmount = params.total_amount

    const order = orders.get(orderNo)
    if (!order) {
      console.error('璁㈠崟涓嶅瓨鍦?', orderNo)
      return res.json('failure')
    }

    order.status = tradeStatus
    order.tradeNo = tradeNo
    order.paidAt = new Date().toISOString()

    console.log('鏀粯鍥炶皟澶勭悊鎴愬姛:', {
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
    return res.status(404).json({ error: '璁㈠崟涓嶅瓨鍦? })
  }

  res.json({ success: true, order })
})

app.post('/api/alipay/query', async (req, res) => {
  try {
    const { orderNo } = req.body

    if (!orderNo) {
      return res.status(400).json({ error: '缂哄皯璁㈠崟鍙? })
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
        error: (response && (response.subMsg || response.msg)) || '鏌ヨ澶辫触'
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
      return res.status(400).json({ error: '缂哄皯璁㈠崟鍙锋垨閫€娆鹃噾棰? })
    }

    const order = orders.get(orderNo)
    if (!order) {
      return res.status(404).json({ error: '璁㈠崟涓嶅瓨鍦? })
    }

    const refundNo = 'REFUND_' + Date.now()

    const response = await alipaySdk.exec('alipay.trade.refund', {
      bizContent: {
        out_trade_no: orderNo,
        refund_amount: parseFloat(refundAmount).toFixed(2),
        refund_reason: refundReason || '鐢ㄦ埛鐢宠閫€娆?,
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
        error: (response && (response.subMsg || response.msg)) || '閫€娆惧け璐?
      })
    }
  } catch (error) {
    console.error('Refund error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`)
  console.log(`  鏀粯瀹濆晢鍩庡悗绔湇鍔″凡鍚姩`)
  console.log(`  HTTP 绔彛: ${PORT}`)
  console.log(`  鏈湴璁块棶: http://localhost:${PORT}`)
  console.log(`  缃戠粶璁块棶: http://${HOST_IP}:${PORT}`)
  console.log(`========================================\n`)
  console.log(`  API 鎺ュ彛:`)
  console.log(`  POST /api/alipay/precreate  - 鍒涘缓鏀粯璁㈠崟`)
  console.log(`  POST /api/alipay/notify     - 鎺ユ敹鏀粯鍥炶皟`)
  console.log(`  GET  /api/order/:orderNo    - 鏌ヨ鏈湴璁㈠崟`)
  console.log(`  POST /api/alipay/query     - 鏌ヨ鏀粯瀹濊鍗昤)
  console.log(`  POST /api/alipay/refund    - 鐢宠閫€娆綻)
  console.log(`  GET  /api/health           - 鍋ュ悍妫€鏌)
  console.log(`\n========================================\n`)
})

if (certOptions.key && certOptions.cert) {
  const HTTPS_PORT = 3001
  https.createServer(certOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`  HTTPS 绔彛: ${HTTPS_PORT} (鑷鍚嶈瘉涔?`)
    console.log(`  缃戠粶璁块棶: https://${HOST_IP}:${HTTPS_PORT}`)
    console.log(`  鎵嬫満闇€鍏堜俊浠昏瘉涔? ${HOST_IP}:${HTTPS_PORT}/api/health`)
    console.log(`\n========================================\n`)
  })
}
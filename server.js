const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const https = require('https')
const fs = require('fs')
const path = require('path')
const AlipaySdk = require('alipay-sdk').default
const crypto = require('crypto')

const APP_ID = process.env.ALIPAY_APP_ID || '2021006185601029'
const RAW_PRIVATE_KEY = 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDQ56iKMCJfj3YnZrw6WVfLr/DRqagGQZATc3zeuI0TIaBoKOcoAiTJ/kWgwEx9EEqW/fkzRftB/ocqevn3OkGyFPWO8DAJ+ph5aAAPWgu/aFqDf0larrVfJAF3lyGCudYBHNXPVp2lEFRtnaEWyysqcS6NuiaL6k01KsPDsGUZgySlOuqAAKFWhPvJDR9IzF5WAOCZmLlaEgf5CDmmX+WwQMNx0KnIcMIEKeD0ZsSlWj+SLSN7N5hR89Y1EDFwQLDuRzSBt9ucAGFsiKKQf6DU7h91tHYKmlqECAKDHpE9UIZV4Xcsj328jzOZOtgHxbLSBOgT0xhsHKyNRzcqfD4TAgMBAAECggEAO2GuSeGW070O4/JTDO76gt63QJHOPkECuFS6qQCisU58rz75Pikl1fkeR6yB0YcA/Nyiqo1493BncY7VYQ5BQGKuznu93AhMsS373mFFN5ptKDXVXx6MVcgBVsIx91vl1hkhObewRgxXQ3VsJfOIiJ71kbnZXSoz2ioWzZhllJNrm7zG91NU0dhtfnbr1puUTXlQRzNqkUG7K4uxryFQBm6kp03Ksxx+wbALzAK3oP77KC0E2ht3rgP9tb7Lhqm/5Oj+6VmwqaRM//KNEoADj659Lr5TY/QUUhfze05Bb8W8ArbDWPH5q59VCM/opKRv+/t4AjSPAlYfq5MthPPpEQKBgQD9yyDhAwXwE2xGyAdhSTNkvNfBdSrKOawWfhne1g6L6ekhmFa59Y5TmLfB6TgR8jtZYVdz8gsaP6ppSs5ohrVASldcEXLsHk1IFXWPv1Y1xloFAPcaCMEkLQlCwkUi13Q+zoHal4SdyvHlocahBWEwdCTdVnQJeO9+ElzkSUuKCQKBgQDSuJ7wrrUg28tcwRbAKZLcbFpq7CV2PhcyF2LCnA6TeyMG0BWbNyvJu56R7RgVaZs1FN4G1k2npev7x9qQl1mTiTlTk3RN1tEr43EODEBTRhFusP3Ov8xDdgja8fsMOXwyvqWgWf0VRLLbVCiLiuseDtavCzLD0uGEl3ywS8t+OwKBgH22s7ehtrw/8r9w7+7pwpJg1ILYlfSL8slFd20hHR2DJV7lxffhQbn5CPT9oC+LjIhuplIhkAxVgwUa7/lo2Lla2cEaR5HcRK2zK4Oj5IFImmimHMCBm6JeyJqP/o0Oql8+DaaIrUE4OPBlXS1/q6/DqEsXOu1CQWdykx7li4x5AoGAFpz7aYbGJ02PCFgsUdjkSsVR+rF237aQFK8PySSoJ8mKG7wO5YZJK6/3t19DO2EG5+5iWUd8M+aJaY6r9OJZGY0bWs2zKHtKHTSeOEy2Rnl5e3CA/EP27rJnBt/6+ffdTTDKY2fk0fh6XTEt3LO+wY4EGerQutURoIIFPoITx2sCgYEAhKj8FURWy7jtvRq2WIuph7VbcwU8rGl9hJmoXhD4h/F1XvsHYWgawzZcvLdw5/p0+4LQZHqbCovwtYvAM85rce102x2CmG9r0xR6kQ/ebf7jM05/oln5Z7Go4vIy8NC5nrM+4i9cJosEwR9vrCNncRrw4JFMZLVB/ZYabNC9P78='
const RAW_PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm2m+Wk3RjmpMM5E6ArDUGxHAboBRyEzttvUFD2m8cyGabuvulSf0oHu+3NZYWk9Mtmb9+QMf3e/v2YfzzoxKp0CUjT9IxvSoT2Ue3oThWi1BFOS7tuy+Wcr/lvtU5ZC8+LcTFw+8WEC4VL6FDzPXgdytEOW84SN3EgKs1wvqx7+5fs0h+YQBAxme6kiQAyVwTnx67SxcAG7uh4oxYsfDI7kffyNSFY0JWLq6CLBIcTcbMaJgYQRClcH3z0miUBG0cOQ5oopD1LvZV6us1tTzpyq3Dc4n9P81zHBNxVWBray+nC2QuFIvnfyTsS7WlANFCR92vMDRzjASTY/GoPjJJQIDAQAB'

let PRIVATE_KEY, PUBLIC_KEY
try {
  const keyObj = crypto.createPrivateKey({ key: Buffer.from(RAW_PRIVATE_KEY, 'base64'), format: 'der', type: 'pkcs8' })
  PRIVATE_KEY = keyObj.export({ type: 'pkcs8', format: 'pem' })
  console.log('Private key parsed OK')
} catch (e) {
  console.error('Private key parse failed:', e.message)
  PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || RAW_PRIVATE_KEY
}
try {
  const pubObj = crypto.createPublicKey({ key: Buffer.from(RAW_PUBLIC_KEY, 'base64'), format: 'der', type: 'spki' })
  PUBLIC_KEY = pubObj.export({ type: 'spki', format: 'pem' })
  console.log('Public key parsed OK')
} catch (e) {
  console.error('Public key parse failed:', e.message)
  PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || RAW_PUBLIC_KEY
}

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

const alipaySdk = new AlipaySdk({
  appId: APP_ID,
  privateKey: PRIVATE_KEY,
  alipayPublicKey: PUBLIC_KEY,
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

app.post('/api/alipay/auth', async (req, res) => {
  try {
    const { authCode } = req.body
    if (!authCode) {
      return res.status(400).json({ error: 'Missing authCode' })
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
        error: (response && (response.subMsg || response.msg)) || 'Auth failed'
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
      return res.status(400).json({ error: 'Missing orderNo or amount' })
    }

    const orderSubject = subject || 'Purchase'
    const totalAmount = parseFloat(amount).toFixed(2)

    const bizContent = {
      out_trade_no: orderNo,
      total_amount: totalAmount,
      subject: orderSubject,
      product_code: 'JSAPI_PAY',
      timeout_express: '30m',
      notify_url: 'https://alipay-mall-backend.onrender.com/api/alipay/notify'
    }

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
        error: (response && (response.subMsg || response.msg)) || 'Create trade failed',
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

    const signVerified = alipaySdk.checkNotifySign(params)

    if (!signVerified) {
      console.error('Sign verification failed')
      return res.json('failure')
    }

    const orderNo = params.out_trade_no
    const tradeStatus = params.trade_status
    const tradeNo = params.trade_no
    const totalAmount = params.total_amount

    const order = orders.get(orderNo)
    if (!order) {
      console.error('Order not found:', orderNo)
      return res.json('failure')
    }

    order.status = tradeStatus
    order.tradeNo = tradeNo
    order.paidAt = new Date().toISOString()

    console.log('Payment notify processed:', {
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
    return res.status(404).json({ error: 'Order not found' })
  }

  res.json({ success: true, order })
})

app.post('/api/alipay/query', async (req, res) => {
  try {
    const { orderNo } = req.body

    if (!orderNo) {
      return res.status(400).json({ error: 'Missing orderNo' })
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
        error: (response && (response.subMsg || response.msg)) || 'Query failed'
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
      return res.status(400).json({ error: 'Missing orderNo or refundAmount' })
    }

    const order = orders.get(orderNo)
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const refundNo = 'REFUND_' + Date.now()

    const response = await alipaySdk.exec('alipay.trade.refund', {
      bizContent: {
        out_trade_no: orderNo,
        refund_amount: parseFloat(refundAmount).toFixed(2),
        refund_reason: refundReason || 'User requested refund',
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
        error: (response && (response.subMsg || response.msg)) || 'Refund failed'
      })
    }
  } catch (error) {
    console.error('Refund error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ===== 预授权代扣相关接口 =====
// 文档: https://opendocs.alipay.com/open/00rt4q

// 内存存储签约关系（生产环境应使用数据库）
const agreements = new Map() // key: externalUserId -> { agreementNo, alipayUserId, alipayLogonId, status, signTime, externalUserId }

// 解析回调参数（支持 form-urlencoded）
function parseNotifyParams(body) {
  if (typeof body === 'object') return body
  if (typeof body !== 'string') return {}
  const params = {}
  body.split('&').forEach(pair => {
    const [k, v] = pair.split('=')
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '')
  })
  return params
}

// 1. 发起签约 POST /api/alipay/agreement/sign
app.post('/api/alipay/agreement/sign', async (req, res) => {
  try {
    const { externalUserId, signValidity, deductPeriod } = req.body || {}

    if (!externalUserId) {
      return res.status(400).json({ error: 'Missing externalUserId' })
    }

    const requestNo = 'SIGN_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)

    // 周期性代扣签约：alipay.user.agreement.sign
    const bizContent = {
      external_agreement_no: externalUserId,
      external_user_display_name: externalUserId,
      sign_validity_period: signValidity || '12m',
      // 商户自定义参数，签约成功回调时带回
      pass_params: JSON.stringify({ externalUserId, requestNo }),
      sign_scene: 'INDUSTRY|DEFAULT',
      access_params: { channel: 'ALIPAYAPP' },
      personal_product_code: 'CYCLE_PAY_AUTH',
      // 销售方案：商家可随时发起扣款
      sales_plan_code: 'PREAUTH'
    }

    const response = await alipaySdk.exec('alipay.user.agreement.sign', {
      bizContent
    })

    console.log('Agreement sign response:', JSON.stringify(response))

    if (response && response.code === '10000' && response.sign_url) {
      // 临时保存请求记录（签约完成通过 notify 回写）
      agreements.set(externalUserId, {
        externalUserId,
        requestNo,
        status: 'pending',
        signTime: new Date().toISOString()
      })

      res.json({
        signUrl: response.sign_url,
        requestNo
      })
    } else {
      res.status(500).json({
        error: (response && (response.subMsg || response.msg)) || 'Sign agreement failed',
        code: response ? response.code : undefined
      })
    }
  } catch (error) {
    console.error('Agreement sign error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 2. 查询签约状态 GET /api/alipay/agreement/query
app.get('/api/alipay/agreement/query', async (req, res) => {
  try {
    const { externalUserId } = req.query

    if (!externalUserId) {
      return res.status(400).json({ error: 'Missing externalUserId' })
    }

    // 先查本地存储
    const local = agreements.get(externalUserId)

    // 调用支付宝查询接口 alipay.user.agreement.query
    let response
    try {
      response = await alipaySdk.exec('alipay.user.agreement.query', {
        bizContent: {
          external_agreement_no: externalUserId
        }
      })
    } catch (e) {
      console.warn('Alipay agreement query failed, fallback to local:', e.message)
    }

    console.log('Agreement query response:', JSON.stringify(response))

    // 支付宝返回有协议
    if (response && response.code === '10000' && response.agreement_no) {
      const info = {
        agreementNo: response.agreement_no,
        alipayUserId: response.alipay_user_id || '',
        alipayLogonId: response.alipay_logon_id || '',
        status: response.status === 'VALID' ? 'active' : (response.status === 'INVALID' ? 'stopped' : 'pending'),
        signTime: response.sign_time || (local && local.signTime) || new Date().toISOString(),
        expireTime: response.invalid_time || undefined,
        externalUserId
      }
      agreements.set(externalUserId, info)
      return res.json({ hasAgreement: true, agreementInfo: info })
    }

    // 支付宝没有，看本地
    if (local && local.agreementNo) {
      return res.json({ hasAgreement: true, agreementInfo: local })
    }

    res.json({ hasAgreement: false })
  } catch (error) {
    console.error('Agreement query error:', error)
    res.status(500).json({ error: error.message })
  }
})

// 3. 签约异步通知 POST /api/alipay/agreement/notify
app.post('/api/alipay/agreement/notify', (req, res) => {
  try {
    const params = parseNotifyParams(req.body)
    console.log('Agreement notify received:', JSON.stringify(params))

    // 验签
    const signVerified = alipaySdk.checkNotifySign(params)
    if (!signVerified) {
      console.error('Agreement notify sign verification failed')
      return res.send('failure')
    }

    // 签约成功通知
    const status = params.status
    const agreementNo = params.agreement_no
    const alipayUserId = params.alipay_user_id
    const alipayLogonId = params.alipay_logon_id
    const externalAgreementNo = params.external_agreement_no
    const signTime = params.sign_time || new Date().toISOString()

    // pass_params 中保存了 externalUserId
    let externalUserId = externalAgreementNo
    try {
      if (params.pass_params) {
        const passParams = JSON.parse(params.pass_params)
        externalUserId = passParams.externalUserId || externalAgreementNo
      }
    } catch (e) {}

    if (status === 'SIGN_SUCCESS' || status === 'VALID') {
      agreements.set(externalUserId, {
        agreementNo,
        alipayUserId,
        alipayLogonId,
        status: 'active',
        signTime,
        externalUserId
      })
      console.log('Agreement saved:', externalUserId, agreementNo)
    } else if (status === 'UNSIGNED' || status === 'INVALID') {
      const existing = agreements.get(externalUserId)
      if (existing) {
        existing.status = 'stopped'
        agreements.set(externalUserId, existing)
      }
      console.log('Agreement stopped:', externalUserId)
    }

    res.send('success')
  } catch (error) {
    console.error('Agreement notify error:', error)
    res.send('failure')
  }
})

// 4. 发起代扣 POST /api/alipay/agreement/deduct
app.post('/api/alipay/agreement/deduct', async (req, res) => {
  try {
    const { orderNo, amount, subject, deductDescription } = req.body || {}

    if (!orderNo || !amount) {
      return res.status(400).json({ error: 'Missing orderNo or amount' })
    }

    // 先查订单中保存的 agreementNo（订单创建时已绑定）
    const order = orders.get(orderNo)
    let agreementNo = order && order.agreementNo

    // 没有则从 externalUserId 关联
    if (!agreementNo && order && order.externalUserId) {
      const ag = agreements.get(order.externalUserId)
      if (ag) agreementNo = ag.agreementNo
    }

    // 仍然没有，尝试从传入参数获取（兼容前端直接传 agreementNo 的场景）
    if (!agreementNo) {
      const { externalUserId } = req.body
      if (externalUserId) {
        const ag = agreements.get(externalUserId)
        if (ag) agreementNo = ag.agreementNo
      }
    }

    if (!agreementNo) {
      return res.status(400).json({
        success: false,
        errorMsg: '用户未签约代扣协议'
      })
    }

    const totalAmount = parseFloat(amount).toFixed(2)

    // 调用 alipay.trade.pay 完成代扣
    const bizContent = {
      out_trade_no: orderNo,
      total_amount: totalAmount,
      subject: subject || '代扣付款',
      product_code: 'CYCLE_PAY',
      agreement_params: {
        agreement_no: agreementNo
      },
      notify_url: 'https://alipay-mall-backend.onrender.com/api/alipay/notify'
    }

    if (deductDescription) {
      bizContent.body = deductDescription
    }

    const response = await alipaySdk.exec('alipay.trade.pay', {
      bizContent
    })

    console.log('Deduct response:', JSON.stringify(response))

    if (response && response.code === '10000') {
      // 保存订单
      orders.set(orderNo, {
        tradeNo: response.trade_no || response.tradeNo,
        amount: totalAmount,
        subject: subject || '代扣付款',
        status: 'TRADE_SUCCESS',
        agreementNo,
        paidAt: new Date().toISOString()
      })

      res.json({
        success: true,
        tradeNo: response.trade_no || response.tradeNo,
        outTradeNo: orderNo,
        totalAmount
      })
    } else {
      res.json({
        success: false,
        errorCode: response && response.subCode,
        errorMsg: (response && (response.subMsg || response.msg)) || '扣款失败'
      })
    }
  } catch (error) {
    console.error('Deduct error:', error)
    res.status(500).json({ success: false, errorMsg: error.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('========================================')
  console.log('  Alipay Mall Backend Started')
  console.log('  HTTP Port: ' + PORT)
  console.log('  Local: http://localhost:' + PORT)
  console.log('  Network: http://' + HOST_IP + ':' + PORT)
  console.log('========================================')
  console.log('')
  console.log('  API Endpoints:')
  console.log('  POST /api/alipay/auth    - OAuth token exchange')
  console.log('  POST /api/alipay/create  - Create JSAPI trade')
  console.log('  POST /api/alipay/notify  - Payment callback')
  console.log('  GET  /api/order/:orderNo - Query local order')
  console.log('  POST /api/alipay/query   - Query alipay order')
  console.log('  POST /api/alipay/refund  - Apply refund')
  console.log('  POST /api/alipay/agreement/sign   - Sign agreement')
  console.log('  GET  /api/alipay/agreement/query   - Query agreement')
  console.log('  POST /api/alipay/agreement/notify  - Agreement notify')
  console.log('  POST /api/alipay/agreement/deduct  - Deduct payment')
  console.log('  GET  /api/health         - Health check')
  console.log('')
  console.log('========================================')
  console.log('')
})

if (certOptions.key && certOptions.cert) {
  const HTTPS_PORT = 3001
  https.createServer(certOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log('  HTTPS Port: ' + HTTPS_PORT + ' (self-signed cert)')
    console.log('  Network: https://' + HOST_IP + ':' + HTTPS_PORT)
    console.log('  Mobile trust first: https://' + HOST_IP + ':' + HTTPS_PORT + '/api/health')
    console.log('')
    console.log('========================================')
    console.log('')
  })
}
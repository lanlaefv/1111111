const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const crypto = require('crypto')
const AlipaySdk = require('alipay-sdk').default

const APP_ID = process.env.ALIPAY_APP_ID || '2021006185601029'
const RAW_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || ''
const RAW_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || ''
const BASE_URL = process.env.BASE_URL || 'https://alipay-mall-backend.onrender.com'

function buildPem(body, label) {
  let result = '-----BEGIN ' + label + '-----\n'
  const clean = body.replace(/\s/g, '')
  for (let i = 0; i < clean.length; i += 64) {
    result += clean.substring(i, i + 64) + '\n'
  }
  result += '-----END ' + label + '-----\n'
  return result
}

function parsePrivateKey(keyStr) {
  if (!keyStr) return keyStr
  const trimmed = keyStr.trim()
  if (trimmed.includes('PRIVATE KEY')) {
    const pem = trimmed.replace(/\\n/g, '\n')
    try {
      crypto.createPrivateKey(pem)
      console.log('[Key] Private key: PEM format OK')
      return pem
    } catch (e) {
      console.log('[Key] PEM parse failed, trying DER...')
    }
  }
  const clean = trimmed.replace(/\s/g, '')
  const derBuffer = Buffer.from(clean, 'base64')
  try {
    const keyObj = crypto.createPrivateKey({ key: derBuffer, format: 'der', type: 'pkcs8' })
    const exported = keyObj.export({ type: 'pkcs8', format: 'pem' })
    console.log('[Key] Private key: DER PKCS8 format OK')
    return exported
  } catch (e1) {
    try {
      const keyObj = crypto.createPrivateKey({ key: derBuffer, format: 'der', type: 'pkcs1' })
      const exported = keyObj.export({ type: 'pkcs1', format: 'pem' })
      console.log('[Key] Private key: DER PKCS1 format OK')
      return exported
    } catch (e2) {
      try {
        const manualPem = buildPem(clean, 'PRIVATE KEY')
        crypto.createPrivateKey(manualPem)
        console.log('[Key] Private key: Manual PEM construction OK')
        return manualPem
      } catch (e3) {
        try {
          crypto.createPublicKey({ key: derBuffer, format: 'der', type: 'spki' })
          console.error('[Key] ERROR: This looks like a PUBLIC key, not a private key!')
        } catch (e4) {
          console.error('[Key] ERROR: ALL private key formats failed')
        }
        return trimmed
      }
    }
  }
}

function parsePublicKey(keyStr) {
  if (!keyStr) return keyStr
  const trimmed = keyStr.trim()
  if (trimmed.includes('PUBLIC KEY')) {
    const pem = trimmed.replace(/\\n/g, '\n')
    try {
      crypto.createPublicKey(pem)
      console.log('[Key] Public key: PEM format OK')
      return pem
    } catch (e) {
      console.log('[Key] Public key PEM parse failed, trying DER...')
    }
  }
  const clean = trimmed.replace(/\s/g, '')
  const derBuffer = Buffer.from(clean, 'base64')
  try {
    const keyObj = crypto.createPublicKey({ key: derBuffer, format: 'der', type: 'spki' })
    const exported = keyObj.export({ type: 'spki', format: 'pem' })
    console.log('[Key] Public key: DER SPKI format OK')
    return exported
  } catch (e1) {
    try {
      const manualPem = buildPem(clean, 'PUBLIC KEY')
      crypto.createPublicKey(manualPem)
      console.log('[Key] Public key: Manual PEM construction OK')
      return manualPem
    } catch (e2) {
      console.error('[Key] ERROR: ALL public key formats failed')
      return trimmed
    }
  }
}

const PRIVATE_KEY = parsePrivateKey(RAW_PRIVATE_KEY)
const PUBLIC_KEY = parsePublicKey(RAW_PUBLIC_KEY)

console.log('========================================')
console.log('  Alipay Backend Configuration')
console.log('========================================')
console.log('  APP_ID:', APP_ID)
console.log('  PRIVATE_KEY:', RAW_PRIVATE_KEY ? (process.env.ALIPAY_PRIVATE_KEY ? 'from env' : 'from default') : 'NOT SET')
console.log('  PUBLIC_KEY:', RAW_PUBLIC_KEY ? (process.env.ALIPAY_PUBLIC_KEY ? 'from env' : 'from default') : 'NOT SET')
console.log('  BASE_URL:', BASE_URL)
console.log('========================================')

let alipaySdk
try {
  if (!PUBLIC_KEY) {
    console.warn('[WARN] ALIPAY_PUBLIC_KEY is not set!')
    console.warn('[WARN] Get it from: https://open.alipay.com -> 你的应用 -> 开发配置')
  }
  if (!PRIVATE_KEY) {
    console.error('[ERROR] ALIPAY_PRIVATE_KEY is not set!')
  }
  alipaySdk = new AlipaySdk({
    appId: APP_ID,
    privateKey: PRIVATE_KEY || '',
    alipayPublicKey: PUBLIC_KEY || '',
    gateway: 'https://openapi.alipay.com/gateway.do',
    signType: 'RSA2',
    keyType: 'PKCS8',
    charset: 'utf-8'
  })
  console.log('[SDK] Initialized OK')
} catch (e) {
  console.error('[SDK] Init FAILED:', e.message)
  alipaySdk = null
}

const app = express()
const PORT = process.env.PORT || 3000

const sessions = new Map()
const agreements = new Map()
const orders = new Map()

function requireSdk(res) {
  if (!alipaySdk) {
    res.status(500).json({ error: '支付服务未初始化，请检查密钥配置' })
    return false
  }
  return true
}

function makeExternalUserId() {
  return 'USER_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
}

app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), sdkReady: !!alipaySdk })
})

app.get('/api/diagnose', (req, res) => {
  res.json({
    appId: APP_ID,
    baseUrl: BASE_URL,
    sdkInitialized: !!alipaySdk,
    privateKeySet: !!RAW_PRIVATE_KEY,
    publicKeySet: !!RAW_PUBLIC_KEY,
    privateKeyFormat: PRIVATE_KEY ? (PRIVATE_KEY.startsWith('-----BEGIN') ? 'PEM' : 'unknown') : 'none',
    publicKeyFormat: PUBLIC_KEY ? (PUBLIC_KEY.startsWith('-----BEGIN') ? 'PEM' : 'unknown') : 'none',
    envVars: {
      ALIPAY_APP_ID: process.env.ALIPAY_APP_ID ? 'set' : 'default',
      ALIPAY_PRIVATE_KEY: process.env.ALIPAY_PRIVATE_KEY ? 'set' : 'default',
      ALIPAY_PUBLIC_KEY: process.env.ALIPAY_PUBLIC_KEY ? 'set' : 'default',
      BASE_URL: process.env.BASE_URL ? 'set' : 'default'
    }
  })
})

app.post('/api/session/create', (req, res) => {
  try {
    const { subject, amount, industry } = req.body || {}
    const sessionId = 'SES_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    const session = {
      id: sessionId,
      subject: subject || '预授权代扣',
      amount: amount || '0.00',
      industry: industry || 'DEFAULT',
      signees: [],
      createdAt: new Date().toISOString()
    }
    sessions.set(sessionId, session)
    const scanUrl = BASE_URL + '/api/scan?session=' + encodeURIComponent(sessionId)
    res.json({
      sessionId,
      scanUrl,
      sessionInfo: {
        subject: session.subject,
        amount: session.amount,
        industry: session.industry,
        signeesCount: 0,
        createdAt: session.createdAt
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/session/:sessionId/signees', (req, res) => {
  try {
    const sessionId = req.params.sessionId
    if (!sessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' })
    }
    const session = sessions.get(sessionId)
    res.json({
      sessionId,
      sessionInfo: {
        subject: session.subject,
        amount: session.amount,
        industry: session.industry,
        createdAt: session.createdAt
      },
      signees: session.signees.map(s => ({
        externalUserId: s.externalUserId,
        agreementNo: s.agreementNo,
        signTime: s.signTime,
        status: s.status,
        deductStatus: s.deductStatus,
        deductTradeNo: s.deductTradeNo,
        deductAmount: s.deductAmount,
        deductTime: s.deductTime,
        deductError: s.deductError
      })),
      totalCount: session.signees.length,
      activeCount: session.signees.filter(s => s.deductStatus === 'success').length
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/scan', async (req, res) => {
  try {
    if (!requireSdk(res)) return
    const sessionId = req.query.session
    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(400).send('无效的签约会话')
    }
    const session = sessions.get(sessionId)
    const externalUserId = makeExternalUserId()
    try {
      const signResp = await alipaySdk.exec('alipay.user.agreement.sign', {
        bizContent: {
          external_user_id: externalUserId,
          product_code: 'CYCLE_PAY_AUTH',
          sign_scene: 'INDUSTRY',
          subject: session.subject,
          industry: session.industry,
          amount: session.amount,
          ext_params: JSON.stringify({ sessionId })
        }
      })
      console.log('[Scan] Sign response:', JSON.stringify(signResp))
      if (signResp && signResp.code === '10000') {
        const signee = {
          externalUserId,
          agreementNo: signResp.agreement_no || signResp.agreementNo || null,
          signTime: new Date().toISOString(),
          status: 'pending',
          deductStatus: 'pending'
        }
        session.signees.push(signee)
        const signUrl = signResp.sign_url || signResp.signUrl
        const html = buildScanHtml(session, signUrl)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.send(html)
      } else {
        const msg = (signResp && (signResp.subMsg || signResp.msg)) || '签约发起失败'
        res.status(500).send(buildErrorHtml('签约发起失败', msg))
      }
    } catch (signErr) {
      console.error('[Scan] Sign error:', signErr)
      res.status(500).send(buildErrorHtml('签约服务异常', signErr.message))
    }
  } catch (error) {
    console.error('[Scan] Error:', error)
    res.status(500).send('Internal Server Error')
  }
})

function buildScanHtml(session, signUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>预授权签约</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: #f5f5f5; }
    .card { background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 320px; width: 100%; }
    .icon { width: 64px; height: 64px; background: #1677FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    h1 { font-size: 18px; margin: 0 0 10px; color: #333; }
    .info { font-size: 14px; color: #666; margin: 8px 0; }
    .amount { font-size: 28px; font-weight: bold; color: #FF4D4F; margin: 15px 0; }
    .btn { display: block; width: 100%; padding: 14px; background: #1677FF; color: #fff; border: none; border-radius: 8px; font-size: 16px; margin-top: 20px; text-decoration: none; text-align: center; }
    .tip { font-size: 12px; color: #999; margin-top: 15px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <path d="M2 7l10 5 10-5" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 12v10" stroke="#fff" stroke-width="2"/>
      </svg>
    </div>
    <h1>预授权代扣签约</h1>
    <div class="info">商品：${session.subject}</div>
    <div class="amount">¥${session.amount}</div>
    <div class="info">签约后将自动代扣到账</div>
    <a href="${signUrl}" class="btn">确认签约并支付</a>
    <div class="tip">点击签约后跳转支付宝完成签约<br>签约成功后将自动代扣</div>
  </div>
</body>
</html>`
}

function buildErrorHtml(title, message) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}.card{background:#fff;padding:30px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.08);text-align:center;max-width:320px}h2{color:#333;margin-bottom:10px}p{color:#666}</style>
</head><body><div class="card"><h2>${title}</h2><p>${message}</p></div></body></html>`
}

app.post('/api/agreement/sign', async (req, res) => {
  try {
    if (!requireSdk(res)) return
    const { externalUserId, subject, amount, industry } = req.body
    if (!externalUserId) {
      return res.status(400).json({ error: 'Missing externalUserId' })
    }
    const bizContent = {
      external_user_id: externalUserId,
      product_code: 'CYCLE_PAY_AUTH',
      sign_scene: 'INDUSTRY',
      subject: subject || '预授权代扣',
      industry: industry || 'DEFAULT'
    }
    if (amount) {
      bizContent.amount = amount
    }
    const response = await alipaySdk.exec('alipay.user.agreement.sign', { bizContent })
    console.log('[Agreement Sign] Response:', JSON.stringify(response))
    if (response && response.code === '10000') {
      const agreementNo = response.agreement_no || response.agreementNo
      agreements.set(externalUserId, {
        agreementNo,
        externalUserId,
        signTime: new Date().toISOString(),
        status: 'pending'
      })
      res.json({
        success: true,
        signUrl: response.sign_url || response.signUrl,
        agreementNo,
        externalUserId
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '签约失败',
        code: response ? response.code : undefined
      })
    }
  } catch (error) {
    console.error('[Agreement Sign] Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/agreement/query', async (req, res) => {
  try {
    const { externalUserId } = req.body
    if (!externalUserId) {
      return res.status(400).json({ error: 'Missing externalUserId' })
    }
    const stored = agreements.get(externalUserId)
    if (!stored) {
      return res.json({ hasAgreement: false })
    }
    res.json({
      hasAgreement: true,
      agreementInfo: {
        agreementNo: stored.agreementNo,
        alipayUserId: stored.externalUserId,
        status: stored.status || 'active',
        signTime: stored.signTime,
        externalUserId: stored.externalUserId
      }
    })
  } catch (error) {
    console.error('[Agreement Query] Error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/agreement/deduct', async (req, res) => {
  try {
    if (!requireSdk(res)) return
    const { agreementNo, amount, subject, outTradeNo } = req.body
    if (!agreementNo || !amount) {
      return res.status(400).json({ error: 'Missing agreementNo or amount' })
    }
    const tradeNo = outTradeNo || 'DEDUCT_' + Date.now()
    const bizContent = {
      out_trade_no: tradeNo,
      total_amount: parseFloat(amount).toFixed(2),
      subject: subject || '预授权代扣',
      product_code: 'CYCLE_PAY_AUTH',
      agreement_params: {
        agreement_no: agreementNo
      }
    }
    const response = await alipaySdk.exec('alipay.trade.pay', { bizContent })
    console.log('[Deduct] Response:', JSON.stringify(response))
    if (response && response.code === '10000') {
      res.json({
        success: true,
        tradeNo: response.trade_no || response.tradeNo,
        outTradeNo: tradeNo,
        totalAmount: response.total_amount || response.totalAmount,
        status: response.trade_status || response.tradeStatus
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '代扣失败',
        code: response ? response.code : undefined
      })
    }
  } catch (error) {
    console.error('[Deduct] Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/agreement/notify', async (req, res) => {
  try {
    const params = req.body
    console.log('[Agreement Notify] Received:', JSON.stringify(params))
    if (!params.sign) {
      return res.json('success')
    }
    if (!requireSdk(res)) {
      return res.json('failure')
    }
    const signVerified = alipaySdk.checkNotifySign(params)
    if (!signVerified) {
      console.error('[Agreement Notify] Sign verification failed')
      return res.json('failure')
    }
    const agreementNo = params.agreement_no
    const externalUserId = params.external_user_id
    const status = params.status
    let sessionId = null
    try {
      if (params.ext_params) {
        const extParams = typeof params.ext_params === 'string' ? JSON.parse(params.ext_params) : params.ext_params
        sessionId = extParams.sessionId
      }
    } catch (e) {
      sessionId = params.session_id || null
    }

    if (status === 'SIGNED' || status === 'ACTIVATED') {
      console.log('[Agreement Notify] Agreement signed, auto-deduct...', { agreementNo, externalUserId, sessionId })
      if (externalUserId) {
        agreements.set(externalUserId, {
          agreementNo,
          externalUserId,
          signTime: new Date().toISOString(),
          status: 'active'
        })
      }
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)
        const signee = session.signees.find(s => s.externalUserId === externalUserId)
        if (signee) {
          signee.agreementNo = agreementNo
          signee.status = 'active'
        }
        try {
          const deductBizContent = {
            out_trade_no: 'DEDUCT_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            total_amount: session.amount,
            subject: session.subject,
            product_code: 'CYCLE_PAY_AUTH',
            agreement_params: {
              agreement_no: agreementNo
            }
          }
          console.log('[Auto Deduct] bizContent:', JSON.stringify(deductBizContent))
          const deductResp = await alipaySdk.exec('alipay.trade.pay', { bizContent: deductBizContent })
          console.log('[Auto Deduct] Response:', JSON.stringify(deductResp))
          if (signee) {
            if (deductResp && deductResp.code === '10000') {
              signee.deductStatus = 'success'
              signee.deductTradeNo = deductResp.trade_no || deductResp.tradeNo
              signee.deductAmount = session.amount
              signee.deductTime = new Date().toISOString()
            } else {
              signee.deductStatus = 'failed'
              signee.deductError = (deductResp && (deductResp.subMsg || deductResp.msg)) || '代扣失败'
            }
          }
        } catch (deductErr) {
          console.error('[Auto Deduct] Error:', deductErr)
          if (signee) {
            signee.deductStatus = 'failed'
            signee.deductError = deductErr.message
          }
        }
      }
    }
    res.json('success')
  } catch (error) {
    console.error('[Agreement Notify] Error:', error)
    res.json('failure')
  }
})

app.post('/api/payment/create', async (req, res) => {
  try {
    if (!requireSdk(res)) return
    const { orderNo, amount, subject, buyerOpenId } = req.body
    if (!orderNo || !amount) {
      return res.status(400).json({ error: 'Missing orderNo or amount' })
    }
    const totalAmount = parseFloat(amount).toFixed(2)
    const bizContent = {
      out_trade_no: orderNo,
      total_amount: totalAmount,
      subject: subject || '商品购买',
      product_code: 'JSAPI_PAY',
      timeout_express: '30m',
      notify_url: BASE_URL + '/api/payment/notify'
    }
    if (buyerOpenId) {
      bizContent.buyer_open_id = buyerOpenId
    }
    const response = await alipaySdk.exec('alipay.trade.create', { bizContent })
    console.log('[Payment Create] Response:', JSON.stringify(response))
    if (response && response.code === '10000') {
      const tradeNo = response.trade_no || response.tradeNo || ''
      orders.set(orderNo, {
        tradeNo,
        amount: totalAmount,
        subject: bizContent.subject,
        status: 'WAIT_BUYER_PAY',
        createdAt: new Date().toISOString()
      })
      res.json({ success: true, tradeNo, orderNo, amount: totalAmount })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '创建交易失败',
        code: response ? response.code : undefined
      })
    }
  } catch (error) {
    console.error('[Payment Create] Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/payment/notify', (req, res) => {
  try {
    const params = req.body
    if (!params.sign) {
      return res.json('success')
    }
    if (!requireSdk(res)) {
      return res.json('failure')
    }
    const signVerified = alipaySdk.checkNotifySign(params)
    if (!signVerified) {
      console.error('[Payment Notify] Sign verification failed')
      return res.json('failure')
    }
    const orderNo = params.out_trade_no
    const tradeStatus = params.trade_status
    const tradeNo = params.trade_no
    const order = orders.get(orderNo)
    if (!order) {
      console.error('[Payment Notify] Order not found:', orderNo)
      return res.json('failure')
    }
    order.status = tradeStatus
    order.tradeNo = tradeNo
    order.paidAt = new Date().toISOString()
    console.log('[Payment Notify] Processed:', { orderNo, tradeStatus, tradeNo })
    res.json('success')
  } catch (error) {
    console.error('[Payment Notify] Error:', error)
    res.json('failure')
  }
})

app.post('/api/payment/query', async (req, res) => {
  try {
    const { orderNo } = req.body
    if (!orderNo) {
      return res.status(400).json({ error: 'Missing orderNo' })
    }
    const response = await alipaySdk.exec('alipay.trade.query', {
      bizContent: { out_trade_no: orderNo }
    })
    console.log('[Payment Query] Response:', JSON.stringify(response))
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
    console.error('[Payment Query] Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/payment/refund', async (req, res) => {
  try {
    if (!requireSdk(res)) return
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
        refund_reason: refundReason || '用户申请退款',
        out_request_no: refundNo
      }
    })
    console.log('[Payment Refund] Response:', JSON.stringify(response))
    if (response && response.code === '10000') {
      res.json({ success: true, refundId: response.refundId, refundNo })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || '退款失败'
      })
    }
  } catch (error) {
    console.error('[Payment Refund] Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.get('/api/order/records', (req, res) => {
  try {
    const records = []
    for (const [orderNo, order] of orders) {
      records.push({ orderNo, ...order })
    }
    records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    res.json({ success: true, records, total: records.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log('')
  console.log('========================================')
  console.log('  Alipay Mall Backend Started')
  console.log('  Port: ' + PORT)
  console.log('  Health: http://localhost:' + PORT + '/api/health')
  console.log('  Diagnose: http://localhost:' + PORT + '/api/diagnose')
  console.log('========================================')
  console.log('')
})
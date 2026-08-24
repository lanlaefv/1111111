const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const https = require('https')
const fs = require('fs')
const path = require('path')
const AlipaySdk = require('alipay-sdk').default
const crypto = require('crypto')

const APP_ID = process.env.ALIPAY_APP_ID || '2021006185601029'
const RAW_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDQ56iKMCJfj3YnZrw6WVfLr/DRqagGQZATc3zeuI0TIaBoKOcoAiTJ/kWgwEx9EEqW/fkzRftB/ocqevn3OkGyFPWO8DAJ+ph5aAAPWgu/aFqDf0larrVfJAF3lyGCudYBHNXPVp2lEFRtnaEWyysqcS6NuiaL6k01KsPDsGUZgySlOuqAAKFWhPvJDR9IzF5WAOCZmLlaEgf5CDmmX+WwQMNx0KnIcMIEKeD0ZsSlWj+SLSN7N5hR89Y1EDFwQLDuRzSBt9ucAGFsiKKQf6DU7h91tHYKmlqECAKDHpE9UIZV4Xcsj328jzOZOtgHxbLSBOgT0xhsHKyNRzcqfD4TAgMBAAECggEAO2GuSeGW070O4/JTDO76gt63QJHOPkECuFS6qQCisU58rz75Pikl1fkeR6yB0YcA/Nyiqo1493BncY7VYQ5BQGKuznu93AhMsS373mFFN5ptKDXVXx6MVcgBVsIx91vl1hkhObewRgxXQ3VsJfOIiJ71kbnZXSoz2ioWzZhllJNrm7zG91NU0dhtfnbr1puUTXlQRzNqkUG7K4uxryFQBm6kp03Ksxx+wbALzAK3oP77KC0E2ht3rgP9tb7Lhqm/5Oj+6VmwqaRM//KNEoADj659Lr5TY/QUUhfze05Bb8W8ArbDWPH5q59VCM/opKRv+/t4AjSPAlYfq5MthPPpEQKBgQD9yyDhAwXwE2xGyAdhSTNkvNfBdSrKOawWfhne1g6L6ekhmFa59Y5TmLfB6TgR8jtZYVdz8gsaP6ppSs5ohrVASldcEXLsHk1IFXWPv1Y1xloFAPcaCMEkLQlCwkUi13Q+zoHal4SdyvHlocahBWEwdCTdVnQJeO9+ElzkSUuKCQKBgQDSuJ7wrrUg28tcwRbAKZLcbFpq7CV2PhcyF2LCnA6TeyMG0BWbNyvJu56R7RgVaZs1FN4G1k2npev7x9qQl1mTiTlTk3RN1tEr43EODEBTRhFusP3Ov8xDdgja8fsMOXwyvqWgWf0VRLLbVCiLiuseDtavCzLD0uGEl3ywS8t+OwKBgH22s7ehtrw/8r9w7+7pwpJg1ILYlfSL8slFd20hHR2DJV7lxffhQbn5CPT9oC+LjIhuplIhkAxVgwUa7/lo2Lla2cEaR5HcRK2zK4Oj5IFImmimHMCBm6JeyJqP/o0Oql8+DaaIrUE4OPBlXS1/q6/DqEsXOu1CQWdykx7li4x5AoGAFpz7aYbGJ02PCFgsUdjkSsVR+rF237aQFK8PySSoJ8mKG7wO5YZJK6/3t19DO2EG5+5iWUd8M+aJaY6r9OJZGY0bWs2zKHtKHTSeOEy2Rnl5e3CA/EP27rJnBt/6+ffdTTDKY2fk0fh6XTEt3LO+wY4EGerQutURoIIFPoITx2sCgYEAhKj8FURWy7jtvRq2WIuph7VbcwU8rGl9hJmoXhD4h/F1XvsHYWgawzZcvLdw5/p0+4LQZHqbCovwtYvAM85rce102x2CmG9r0xR6kQ/ebf7jM05/oln5Z7Go4vIy8NC5nrM+4i9cJosEwR9vrCNncRrw4JFMZLVB/ZYabNC9P78='
const RAW_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAm2m+Wk3RjmpMM5E6ArDUGxHAboBRyEzttvUFD2m8cyGabuvulSf0oHu+3NZYWk9Mtmb9+QMf3e/v2YfzzoxKp0CUjT9IxvSoT2Ue3oThWi1BFOS7tuy+Wcr/lvtU5ZC8+LcTFw+8WEC4VL6FDzPXgdytEOW84SN3EgKs1wvqx7+5fs0h+YQBAxme6kiQAyVwTnx67SxcAG7uh4oxYsfDI7kffyNSFY0JWLq6CLBIcTcbMaJgYQRClcH3z0miUBG0cOQ5oopD1LvZV6us1tTzpyq3Dc4n9P81zHBNxVWBray+nC2QuFIvnfyTsS7WlANFCR92vMDRzjASTY/GoPjJJQIDAQAB'

function parsePrivateKey(keyStr) {
  if (!keyStr) return keyStr
  try {
    if (keyStr.includes('PRIVATE KEY')) {
      const pem = keyStr.replace(/\\n/g, '\n').trim()
      const keyObj = crypto.createPrivateKey(pem)
      const exported = keyObj.export({ type: 'pkcs8', format: 'pem' })
      console.log('Private key parsed from PEM OK')
      return exported
    }
    const base64Clean = keyStr.replace(/\s/g, '')
    const derBuffer = Buffer.from(base64Clean, 'base64')
    const keyObj = crypto.createPrivateKey({ key: derBuffer, format: 'der', type: 'pkcs8' })
    const exported = keyObj.export({ type: 'pkcs8', format: 'pem' })
    console.log('Private key parsed from DER OK')
    return exported
  } catch (e) {
    console.error('Private key parse failed:', e.message)
    return keyStr.replace(/\\n/g, '\n').trim()
  }
}

function parsePublicKey(keyStr) {
  if (!keyStr) return keyStr
  try {
    if (keyStr.includes('PUBLIC KEY')) {
      const pem = keyStr.replace(/\\n/g, '\n').trim()
      const keyObj = crypto.createPublicKey(pem)
      const exported = keyObj.export({ type: 'spki', format: 'pem' })
      console.log('Public key parsed from PEM OK')
      return exported
    }
    const base64Clean = keyStr.replace(/\s/g, '')
    const derBuffer = Buffer.from(base64Clean, 'base64')
    const keyObj = crypto.createPublicKey({ key: derBuffer, format: 'der', type: 'spki' })
    const exported = keyObj.export({ type: 'spki', format: 'pem' })
    console.log('Public key parsed from DER OK')
    return exported
  } catch (e) {
    console.error('Public key parse failed:', e.message)
    return keyStr.replace(/\\n/g, '\n').trim()
  }
}

const PRIVATE_KEY = parsePrivateKey(RAW_PRIVATE_KEY)
const PUBLIC_KEY = parsePublicKey(RAW_PUBLIC_KEY)

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

const signSessions = new Map()

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

const BASE_URL = process.env.BASE_URL || 'https://alipay-mall-backend.onrender.com'

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
    console.log('Payment notify processed:', { orderNo, tradeStatus, tradeNo, totalAmount })
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
      res.json({ success: true, refundId: response.refundId, refundNo })
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

app.post('/api/alipay/agreement/sign', async (req, res) => {
  try {
    const { externalUserId, signScene, subject, amount, industry } = req.body
    if (!externalUserId) {
      return res.status(400).json({ error: 'Missing externalUserId' })
    }
    const bizContent = {
      external_user_id: externalUserId,
      product_code: 'CYCLE_PAY_AUTH',
      sign_scene: signScene || 'INDUSTRY',
      subject: subject || '棰勬巿鏉冧唬鎵?,
      industry: industry || 'DEFAULT'
    }
    if (amount) {
      bizContent.amount = amount
    }
    const response = await alipaySdk.exec('alipay.user.agreement.sign', {
      bizContent
    })
    console.log('Agreement sign response:', JSON.stringify(response))
    if (response && response.code === '10000') {
      res.json({
        success: true,
        signUrl: response.sign_url || response.signUrl,
        agreementNo: response.agreement_no || response.agreementNo,
        externalUserId
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || 'Agreement sign failed',
        code: response ? response.code : undefined
      })
    }
  } catch (error) {
    console.error('Agreement sign error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/alipay/agreement/query', async (req, res) => {
  try {
    const { agreementNo } = req.body
    if (!agreementNo) {
      return res.status(400).json({ error: 'Missing agreementNo' })
    }
    const response = await alipaySdk.exec('alipay.user.agreement.query', {
      bizContent: { agreement_no: agreementNo }
    })
    console.log('Agreement query response:', JSON.stringify(response))
    if (response && response.code === '10000') {
      res.json({
        success: true,
        status: response.status,
        agreementNo: response.agreement_no || response.agreementNo,
        externalUserId: response.external_user_id || response.externalUserId
      })
    } else {
      res.status(500).json({
        success: false,
        error: (response && (response.subMsg || response.msg)) || 'Agreement query failed'
      })
    }
  } catch (error) {
    console.error('Agreement query error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/alipay/agreement/deduct', async (req, res) => {
  try {
    const { agreementNo, amount, subject, outTradeNo } = req.body
    if (!agreementNo || !amount) {
      return res.status(400).json({ error: 'Missing agreementNo or amount' })
    }
    const tradeNo = outTradeNo || 'DEDUCT_' + Date.now()
    const bizContent = {
      out_trade_no: tradeNo,
      total_amount: parseFloat(amount).toFixed(2),
      subject: subject || '棰勬巿鏉冧唬鎵?,
      product_code: 'CYCLE_PAY_AUTH',
      agreement_params: {
        agreement_no: agreementNo
      }
    }
    const response = await alipaySdk.exec('alipay.trade.pay', {
      bizContent
    })
    console.log('Deduct response:', JSON.stringify(response))
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
        error: (response && (response.subMsg || response.msg)) || 'Deduct failed',
        code: response ? response.code : undefined
      })
    }
  } catch (error) {
    console.error('Deduct error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

app.post('/api/alipay/agreement/notify', async (req, res) => {
  try {
    const params = req.body
    console.log('Agreement notify received:', JSON.stringify(params))
    if (!params.sign) {
      return res.json('success')
    }
    const signVerified = alipaySdk.checkNotifySign(params)
    if (!signVerified) {
      console.error('Agreement notify sign verification failed')
      return res.json('failure')
    }
    const agreementNo = params.agreement_no
    const externalUserId = params.external_user_id
    const status = params.status
    const sessionId = params.session_id || (params.ext_params && JSON.parse(params.ext_params).sessionId)
    if (status === 'SIGNED' || status === 'ACTIVATED') {
      console.log('Agreement signed, attempting auto-deduct...', { agreementNo, externalUserId, sessionId })
      if (sessionId && signSessions.has(sessionId)) {
        const session = signSessions.get(sessionId)
        const existingSignee = session.signees.find(s => s.externalUserId === externalUserId)
        if (!existingSignee) {
          session.signees.push({
            externalUserId,
            agreementNo,
            signTime: new Date().toISOString(),
            status: 'active',
            deductStatus: 'pending'
          })
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
          console.log('Auto-deduct bizContent:', JSON.stringify(deductBizContent))
          const deductResp = await alipaySdk.exec('alipay.trade.pay', { bizContent: deductBizContent })
          console.log('Auto-deduct response:', JSON.stringify(deductResp))
          const signee = session.signees.find(s => s.externalUserId === externalUserId)
          if (signee) {
            if (deductResp && deductResp.code === '10000') {
              signee.deductStatus = 'success'
              signee.deductTradeNo = deductResp.trade_no || deductResp.tradeNo
              signee.deductAmount = session.amount
              signee.deductTime = new Date().toISOString()
            } else {
              signee.deductStatus = 'failed'
              signee.deductError = (deductResp && (deductResp.subMsg || deductResp.msg)) || '浠ｆ墸澶辫触'
            }
          }
        } catch (deductErr) {
          console.error('Auto-deduct error:', deductErr)
          const signee = session.signees.find(s => s.externalUserId === externalUserId)
          if (signee) {
            signee.deductStatus = 'failed'
            signee.deductError = deductErr.message
          }
        }
        console.log('Session updated:', JSON.stringify({
          sessionId,
          signees: session.signees.length,
          activeCount: session.signees.filter(s => s.deductStatus === 'success').length
        }))
      }
    }
    res.json('success')
  } catch (error) {
    console.error('Agreement notify error:', error)
    res.json('failure')
  }
})

app.post('/api/alipay/agreement/session/create', (req, res) => {
  try {
    const { subject, amount, industry } = req.body || {}
    const sessionId = 'SES_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    const session = {
      id: sessionId,
      subject: subject || '棰勬巿鏉冧唬鎵?,
      amount: amount || '0.00',
      industry: industry || 'DEFAULT',
      signees: [],
      createdAt: new Date().toISOString()
    }
    signSessions.set(sessionId, session)
    const scanUrl = `${BASE_URL}/api/alipay/agreement/scan?session=${sessionId}`
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

app.get('/api/alipay/agreement/scan', async (req, res) => {
  try {
    const sessionId = req.query.session
    if (!sessionId || !signSessions.has(sessionId)) {
      return res.status(400).send('鏃犳晥鐨勭绾︿細璇?)
    }
    const session = signSessions.get(sessionId)
    const externalUserId = 'USER_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    try {
      const signBizContent = {
        external_user_id: externalUserId,
        product_code: 'CYCLE_PAY_AUTH',
        sign_scene: 'INDUSTRY',
        subject: session.subject,
        industry: session.industry,
        amount: session.amount,
        ext_params: JSON.stringify({ sessionId })
      }
      const signResp = await alipaySdk.exec('alipay.user.agreement.sign', {
        bizContent: signBizContent
      })
      console.log('Scan sign response:', JSON.stringify(signResp))
      if (signResp && signResp.code === '10000') {
        const signee = {
          externalUserId,
          agreementNo: signResp.agreement_no || signResp.agreementNo,
          signTime: new Date().toISOString(),
          status: 'pending',
          deductStatus: 'pending'
        }
        session.signees.push(signee)
        const signUrl = signResp.sign_url || signResp.signUrl
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>棰勬巿鏉冪绾?/title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; background: #f5f5f5; }
    .card { background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 320px; width: 100%; }
    .icon { width: 64px; height: 64px; background: #1677FF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .icon svg { width: 32px; height: 32px; }
    h1 { font-size: 18px; margin: 0 0 10px; color: #333; }
    .info { font-size: 14px; color: #666; margin: 8px 0; }
    .amount { font-size: 28px; font-weight: bold; color: #FF4D4F; margin: 15px 0; }
    .btn { display: block; width: 100%; padding: 14px; background: #1677FF; color: #fff; border: none; border-radius: 8px; font-size: 16px; margin-top: 20px; text-decoration: none; text-align: center; box-sizing: border-box; }
    .btn:active { background: #0958D9; }
    .tip { font-size: 12px; color: #999; margin-top: 15px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <path d="M2 7l10 5 10-5" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <path d="M12 12v10" stroke="#fff" stroke-width="2"/>
      </svg>
    </div>
    <h1>棰勬巿鏉冧唬鎵ｇ绾?/h1>
    <div class="info">鍟嗗搧锛?{session.subject}</div>
    <div class="amount">楼${session.amount}</div>
    <div class="info">绛剧害鍚庡皢鑷姩浠ｆ墸鍒拌处</div>
    <a href="${signUrl}" class="btn">纭绛剧害骞舵敮浠?/a>
    <div class="tip">鐐瑰嚮绛剧害鍚庤烦杞敮浠樺疂瀹屾垚绛剧害<br>绛剧害鎴愬姛鍚庡皢鑷姩浠ｆ墸</div>
  </div>
</body>
</html>`
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.send(html)
      } else {
        res.status(500).send(`<html><body><h2>绛剧害鍙戣捣澶辫触</h2><p>${signResp ? (signResp.subMsg || signResp.msg) : '鏈煡閿欒'}</p></body></html>`)
      }
    } catch (signErr) {
      console.error('Sign error:', signErr)
      res.status(500).send(`<html><body><h2>绛剧害鏈嶅姟寮傚父</h2><p>${signErr.message}</p></body></html>`)
    }
  } catch (error) {
    console.error('Scan error:', error)
    res.status(500).send('Internal Server Error')
  }
})

app.get('/api/alipay/agreement/session/:sessionId/signees', (req, res) => {
  try {
    const sessionId = req.params.sessionId
    if (!signSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' })
    }
    const session = signSessions.get(sessionId)
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
  console.log('  HTTP Port: ' + PORT)
  console.log('  Local: http://localhost:' + PORT)
  console.log('  Network: http://' + HOST_IP + ':' + PORT)
  console.log('========================================')
  console.log('')
  console.log('  API Endpoints:')
  console.log('  POST /api/alipay/auth                          - OAuth token exchange')
  console.log('  POST /api/alipay/create                        - Create JSAPI trade')
  console.log('  POST /api/alipay/notify                        - Payment callback')
  console.log('  GET  /api/order/:orderNo                       - Query local order')
  console.log('  POST /api/alipay/query                         - Query alipay order')
  console.log('  POST /api/alipay/refund                        - Apply refund')
  console.log('  POST /api/alipay/agreement/sign                - Sign agreement')
  console.log('  POST /api/alipay/agreement/query               - Query agreement')
  console.log('  POST /api/alipay/agreement/deduct              - Manual deduct')
  console.log('  POST /api/alipay/agreement/notify             - Agreement callback (auto-deduct)')
  console.log('  POST /api/alipay/agreement/session/create      - Create sign session')
  console.log('  GET  /api/alipay/agreement/scan                - Scan sign page')
  console.log('  GET  /api/alipay/agreement/session/:id/signees - Query signees')
  console.log('  GET  /api/order/records                        - All order records')
  console.log('  GET  /api/health                               - Health check')
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
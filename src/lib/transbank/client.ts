import { WebpayPlus, Options, Environment } from 'transbank-sdk'

const environment = process.env.TBK_ENVIRONMENT === 'production'
  ? Environment.Production
  : Environment.Integration

const commerceCode = process.env.TBK_COMMERCE_CODE!
const apiKey = process.env.TBK_API_KEY!

export const webpayTransaction = new WebpayPlus.Transaction(
  new Options(commerceCode, apiKey, environment)
)

export const PLAN_PRICES: Record<string, number> = {
  Pro_Mensual: 9900,
  Pro_Anual: 95040,
}

export const PLAN_DURATIONS: Record<string, number> = {
  Pro_Mensual: 30,
  Pro_Anual: 365,
}

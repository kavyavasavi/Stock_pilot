
import { useEffect, useState } from 'react'
import { supabase } from '../Service/Supabase/client'
import './sales.css'

// Train a simple linear regression model using daily sales.
function trainForecastModel(dailySales) {
  const n = dailySales.length

  if (n < 7) return null

  const meanX = (n - 1) / 2
  const meanY = dailySales.reduce((sum, value) => sum + value, 0) / n

  let numerator = 0
  let denominator = 0

  dailySales.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY)
    denominator += (index - meanX) ** 2
  })

  const slope = denominator === 0 ? 0 : numerator / denominator
  const intercept = meanY - slope * meanX

  const predict = day => Math.max(0, intercept + slope * day)

  const next7Days = Array.from(
    { length: 7 },
    (_, index) => predict(n + index)
  )

  return {
    predict,
    slope,
    averageDaily: meanY,
    next7Days,
    demand7Days: next7Days.reduce((sum, value) => sum + value, 0)
  }
}

function Forecasting() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [trainedCount, setTrainedCount] = useState(0)

  useEffect(() => {
    async function loadForecast() {
      setLoading(true)
      setError('')

      const now = new Date()
      const start = new Date(now)
      start.setDate(start.getDate() - 30)

      const [{ data: products, error: productError },
        { data: movements, error: movementError }] = await Promise.all([
        supabase
          .from('products')
          .select(
            'id,name,sku,unit,current_quantity,reorder_level,pack_size,supplier_lead_days'
          )
          .eq('is_archived', false),

        supabase
          .from('stock_movements')
          .select('product_id,quantity_change,created_at')
          .eq('movement_type', 'sale')
          .gte('created_at', start.toISOString())
          .order('created_at', { ascending: true })
      ])

      if (productError || movementError) {
        setError(productError?.message || movementError?.message)
        setLoading(false)
        return
      }

      const dayKey = date => date.toISOString().slice(0, 10)
      const today = new Date(dayKey(now) + 'T00:00:00.000Z')

      const forecasts = (products || []).map(product => {
        const sales = (movements || []).filter(
          movement =>
            movement.product_id === product.id &&
            Number(movement.quantity_change) < 0
        )

        const dailyMap = {}

        sales.forEach(movement => {
          const key = dayKey(new Date(movement.created_at))
          dailyMap[key] = (dailyMap[key] || 0) +
            Math.abs(Number(movement.quantity_change))
        })

        const saleDates = Object.keys(dailyMap).sort()
        const firstSale = saleDates.length
          ? new Date(saleDates[0] + 'T00:00:00.000Z')
          : null

        const historyDays = firstSale
          ? Math.floor((today - firstSale) / 86400000) + 1
          : 0

        const daysToTrain = Math.min(30, historyDays)
        const dailySales = []

        if (firstSale) {
          for (let i = 0; i < daysToTrain; i++) {
            const date = new Date(firstSale)
            date.setUTCDate(date.getUTCDate() + i)
            dailySales.push(dailyMap[dayKey(date)] || 0)
          }
        }

        const model = trainForecastModel(dailySales)
        const stock = Number(product.current_quantity || 0)
        const reorderLevel = Number(product.reorder_level || 0)
        const leadDays = Math.max(
          0,
          Number(product.supplier_lead_days || 0)
        )
        const packSize = Math.max(1, Number(product.pack_size || 1))

        if (!model) {
          return {
            ...product,
            historyDays,
            enoughHistory: false,
            demand7Days: null,
            averageDaily: null,
            daysCover: null,
            stockoutDate: null,
            recommendation: null,
            risk: 'Insufficient data',
            trend: 'Unknown'
          }
        }

        const daysCover = model.averageDaily > 0
          ? stock / model.averageDaily
          : null

        const stockoutDate = daysCover !== null
          ? new Date(now.getTime() + daysCover * 86400000)
          : null

        const futureDemand = Array.from(
          { length: leadDays + 7 },
          (_, index) => model.predict(dailySales.length + index)
        ).reduce((sum, value) => sum + value, 0)

        const rawRestock = Math.max(0, futureDemand - stock)
        const recommendation = rawRestock > 0
          ? Math.ceil(rawRestock / packSize) * packSize
          : 0

        let risk = 'Healthy'

        if (stock <= 0) {
          risk = 'Out of stock'
        } else if (
          daysCover !== null &&
          daysCover <= leadDays
        ) {
          risk = 'Critical'
        } else if (
          stock <= reorderLevel ||
          (daysCover !== null && daysCover <= leadDays + 3)
        ) {
          risk = 'High risk'
        } else if (
          daysCover !== null &&
          daysCover <= leadDays + 7
        ) {
          risk = 'Medium risk'
        }

        return {
          ...product,
          historyDays,
          enoughHistory: true,
          demand7Days: model.demand7Days,
          averageDaily: model.averageDaily,
          daysCover,
          stockoutDate,
          recommendation,
          risk,
          trend: model.slope > 0.05
            ? 'Increasing'
            : model.slope < -0.05
              ? 'Decreasing'
              : 'Stable',
          slope: model.slope
        }
      })

      setRows(forecasts)
      setTrainedCount(forecasts.filter(p => p.enoughHistory).length)
      setLoading(false)
    }

    loadForecast()
  }, [])

  const ranked = [...rows]
    .filter(p => p.enoughHistory)
    .sort((a, b) => b.demand7Days - a.demand7Days)

  const atRisk = rows.filter(
    p => p.enoughHistory && p.risk !== 'Healthy'
  )

  const formatDate = date =>
    date ? date.toLocaleDateString() : '—'

  if (loading) {
    return <div className="sales-page">Training forecasting models...</div>
  }

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>AI Demand Forecasting</h1>
          <p>
            Product-level demand predictions trained from historical sales.
          </p>
        </div>
      </div>

      {error && <div className="sales-error">{error}</div>}

      <div className="sales-layout">
        <section className="sales-card">
          <h2>Model status</h2>
          <div className="sales-total">
            <span>Models trained</span>
            <strong>{trainedCount}</strong>
          </div>
          <div className="sales-total">
            <span>Products analysed</span>
            <strong>{rows.length}</strong>
          </div>
          <div className="sales-total">
            <span>Products at risk</span>
            <strong>{atRisk.length}</strong>
          </div>
          <p className="empty-cart">
            Model: Linear Regression. Training data: up to 30 days of recorded
            sales movements. Products need at least 7 calendar days of
            sales history.
          </p>
        </section>

        <section className="sales-card">
          <h2>Fastest-selling products</h2>
          {ranked.length === 0 ? (
            <p className="empty-cart">
              Not enough historical sales data to rank products yet.
            </p>
          ) : ranked.slice(0, 5).map((product, index) => (
            <div className="available-product" key={product.id}>
              <div>
                <strong>#{index + 1} {product.name}</strong>
                <small>{product.trend} demand trend</small>
              </div>
              <strong>
                {product.demand7Days.toFixed(1)} units
              </strong>
            </div>
          ))}
        </section>
      </div>

      <section className="sales-card" style={{ marginTop: 22 }}>
        <h2>7-day demand predictions and stockout risks</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            minWidth: 850,
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#aaa' }}>
                <th style={{ padding: 12 }}>Product</th>
                <th style={{ padding: 12 }}>Current stock</th>
                <th style={{ padding: 12 }}>7-day demand</th>
                <th style={{ padding: 12 }}>Days cover</th>
                <th style={{ padding: 12 }}>Stockout date</th>
                <th style={{ padding: 12 }}>Trend</th>
                <th style={{ padding: 12 }}>Risk</th>
                <th style={{ padding: 12 }}>Suggested order</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(product => (
                <tr key={product.id} style={{
                  borderTop: '1px solid #383838'
                }}>
                  <td style={{ padding: 12 }}>
                    <strong>{product.name}</strong>
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {product.sku}
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.current_quantity} {product.unit}
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.enoughHistory
                      ? `${product.demand7Days.toFixed(1)} ${product.unit}`
                      : 'Insufficient history'}
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.daysCover === null
                      ? '—'
                      : `${product.daysCover.toFixed(1)} days`}
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.enoughHistory
                      ? formatDate(product.stockoutDate)
                      : '—'}
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.trend}
                  </td>
                  <td style={{
                    padding: 12,
                    color: product.risk === 'Critical' ||
                      product.risk === 'Out of stock'
                      ? '#ff7777'
                      : product.risk === 'High risk' ||
                        product.risk === 'Medium risk'
                        ? '#ffbd63'
                        : '#9ce5ad'
                  }}>
                    {product.risk}
                  </td>
                  <td style={{ padding: 12 }}>
                    {product.recommendation === null
                      ? 'Insufficient history'
                      : `${product.recommendation} ${product.unit}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="empty-cart">
        Predictions are estimates from a simple linear regression model.
        They are not guarantees of future sales. Results depend on the
        available sales history and should be reviewed before purchasing.
      </p>
    </div>
  )
}

export default Forecasting

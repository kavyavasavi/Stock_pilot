
import { useEffect, useState } from 'react'
import { supabase } from '../Service/Supabase/client'
import './sales.css'

function PurchaseInvoices() {
  const [products, setProducts] = useState([])
  const [supplier, setSupplier] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [cost, setCost] = useState('')
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,sku,unit,current_quantity,cost_price')
        .eq('is_archived', false)
        .order('name')

      if (error) setError(error.message)
      else setProducts(data || [])
    }
    load()
  }, [])

  function addItem() {
    setError('')
    const product = products.find(p => p.id === productId)
    const qty = Number(quantity)
    const price = Number(cost)

    if (!product || !Number.isFinite(qty) || qty <= 0 ||
        !Number.isFinite(price) || price < 0) {
      setError('Select a product and enter valid quantity and cost.')
      return
    }

    setItems(prev => [
      ...prev,
      {
        product_id: product.id,
        name: product.name,
        unit: product.unit,
        quantity: qty,
        unit_cost: price
      }
    ])
    setProductId('')
    setQuantity(1)
    setCost('')
  }

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost, 0
  )

  async function confirmInvoice() {
    setError('')
    setMessage('')

    if (!supplier.trim() || !invoiceNumber.trim() || !items.length) {
      setError('Enter supplier, invoice number and at least one item.')
      return
    }

    setBusy(true)
    const { data, error } = await supabase.rpc('record_purchase', {
      p_invoice_number: invoiceNumber.trim(),
      p_supplier_name: supplier.trim(),
      p_invoice_date: invoiceDate,
      p_items: items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost
      })),
      p_idempotency_key: crypto.randomUUID()
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage(`Invoice confirmed. Total: ₹${total.toFixed(2)}. Stock updated.`)
      setItems([])
      setSupplier('')
      setInvoiceNumber('')
      const { data: refreshed } = await supabase
        .from('products')
        .select('id,name,sku,unit,current_quantity,cost_price')
        .eq('is_archived', false)
        .order('name')
      if (refreshed) setProducts(refreshed)
    }

    setBusy(false)
  }

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>Purchase invoices</h1>
          <p>Enter, review and confirm incoming stock.</p>
        </div>
      </div>

      {error && <div className="sales-error">{error}</div>}
      {message && <div className="sales-success">{message}</div>}

      <section className="sales-card">
        <h2>Invoice details</h2>

        <label>Supplier name</label>
        <input value={supplier} onChange={e => setSupplier(e.target.value)}
          placeholder="Enter supplier name" />

        <label>Invoice number</label>
        <input value={invoiceNumber}
          onChange={e => setInvoiceNumber(e.target.value)}
          placeholder="e.g. INV-2026-001" />

        <label>Invoice date</label>
        <input type="date" value={invoiceDate}
          onChange={e => setInvoiceDate(e.target.value)} />

        <h2 style={{ marginTop: 28 }}>Add invoice items</h2>

        <label>Product</label>
        <select value={productId} onChange={e => {
          setProductId(e.target.value)
          const p = products.find(x => x.id === e.target.value)
          setCost(p?.cost_price ?? '')
        }}>
          <option value="">Choose product</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — Current stock: {p.current_quantity}
            </option>
          ))}
        </select>

        <label>Quantity received</label>
        <input type="number" min="0.001" step="0.001"
          value={quantity} onChange={e => setQuantity(e.target.value)} />

        <label>Unit cost (₹)</label>
        <input type="number" min="0" step="0.01"
          value={cost} onChange={e => setCost(e.target.value)} />

        <button className="sales-primary" onClick={addItem}>
          Add invoice item
        </button>
      </section>

      <section className="sales-card" style={{ marginTop: 22 }}>
        <h2>Review invoice</h2>

        {items.length === 0 ? (
          <p className="empty-cart">No invoice items added.</p>
        ) : items.map((item, index) => (
          <div className="available-product" key={`${item.product_id}-${index}`}>
            <div>
              <strong>{item.name}</strong>
              <small>{item.quantity} {item.unit} × ₹{item.unit_cost}</small>
            </div>
            <strong>₹{(item.quantity * item.unit_cost).toFixed(2)}</strong>
            <button className="remove-item"
              onClick={() => setItems(items.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
        ))}

        <div className="sales-total">
          <span>Invoice total</span>
          <strong>₹{total.toFixed(2)}</strong>
        </div>

        <button className="sales-primary" onClick={confirmInvoice}
          disabled={busy || !items.length}>
          {busy ? 'Confirming...' : 'Confirm invoice and update stock'}
        </button>
        <p className="empty-cart">
          Stock changes only after you confirm. This version uses manual invoice entry;
          automatic OCR extraction is not implemented.
        </p>
      </section>
    </div>
  )
}

export default PurchaseInvoices

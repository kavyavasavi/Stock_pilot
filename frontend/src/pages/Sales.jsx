
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../Service/Supabase/client'
import './sales.css'

function Sales({ session }) {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.selling_price, 0),
    [cart]
  )

  async function loadProducts() {
    setLoading(true)

    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, unit, selling_price, current_quantity')
      .eq('is_archived', false)
      .order('name')

    if (error) {
      setError(error.message)
    } else {
      setProducts(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function addToCart() {
    setError('')
    setMessage('')

    const product = products.find(p => p.id === selectedProduct)
    const qty = Number(quantity)

    if (!product) {
      setError('Please select a product.')
      return
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      setError('Enter a valid whole-number quantity.')
      return
    }

    const existing = cart.find(item => item.product_id === product.id)
    const alreadyAdded = existing?.quantity || 0

    if (alreadyAdded + qty > Number(product.current_quantity)) {
      setError(`Only ${product.current_quantity} ${product.unit} available.`)
      return
    }

    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + qty }
          : item
      ))
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          selling_price: Number(product.selling_price),
          quantity: qty
        }
      ])
    }

    setSelectedProduct('')
    setQuantity(1)
  }

  function updateQuantity(productId, value) {
    const qty = Number(value)
    const product = products.find(p => p.id === productId)

    if (!product || !Number.isInteger(qty) || qty <= 0) return
    if (qty > Number(product.current_quantity)) return

    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: qty }
        : item
    ))
  }

  async function completeSale() {
    setError('')
    setMessage('')

    if (!cart.length) {
      setError('Add at least one product.')
      return
    }

    setSaving(true)

    const idempotencyKey = crypto.randomUUID()

    const { data, error } = await supabase.rpc('record_sale', {
      p_items: cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      })),
      p_idempotency_key: idempotencyKey
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Sale recorded successfully!')
      setCart([])
      await loadProducts()
    }

    setSaving(false)
  }

  if (loading) {
    return <div className="sales-page">Loading products...</div>
  }

  return (
    <div className="sales-page">
      <div className="sales-header">
        <div>
          <h1>Sales</h1>
          <p>Record customer sales and update inventory.</p>
        </div>
      </div>

      {error && <div className="sales-error">{error}</div>}
      {message && <div className="sales-success">{message}</div>}

      <div className="sales-layout">
        <section className="sales-card">
          <h2>Add products</h2>

          <label>Select product</label>
          <select
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
          >
            <option value="">Choose a product</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} — Stock: {product.current_quantity}
              </option>
            ))}
          </select>

          <label>Quantity</label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />

          <button onClick={addToCart} className="sales-primary">
            Add to sale
          </button>

          <h2 className="cart-heading">Available products</h2>

          <div className="available-products">
            {products.map(product => (
              <div className="available-product" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.sku}</small>
                </div>
                <span>₹{Number(product.selling_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sales-card">
          <h2>Current sale</h2>

          {cart.length === 0 ? (
            <p className="empty-cart">No products added yet.</p>
          ) : (
            <div className="cart-items">
              {cart.map(item => (
                <div className="cart-item" key={item.product_id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>₹{item.selling_price.toFixed(2)} / {item.unit}</small>
                  </div>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={e =>
                      updateQuantity(item.product_id, e.target.value)
                    }
                  />

                  <strong>
                    ₹{(item.quantity * item.selling_price).toFixed(2)}
                  </strong>

                  <button
                    className="remove-item"
                    onClick={() =>
                      setCart(cart.filter(
                        p => p.product_id !== item.product_id
                      ))
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="sales-total">
            <span>Total amount</span>
            <strong>₹{total.toFixed(2)}</strong>
          </div>

          <button
            className="sales-primary complete-sale"
            onClick={completeSale}
            disabled={saving || cart.length === 0}
          >
            {saving ? 'Processing...' : 'Complete sale'}
          </button>
        </section>
      </div>
    </div>
  )
}

export default Sales


import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../Service/Supabase/client'
import './pages.css'

const emptyProduct = {
  name: '',
  sku: '',
  category: '',
  unit: 'pcs',
  selling_price: '',
  cost_price: '',
  reorder_level: ''
}

function Dashboard({ session }) {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [productForm, setProductForm] = useState(emptyProduct)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, business_id, full_name, role')
      .eq('id', session.user.id)
      .single()

    if (profileError || !userProfile) {
      setError(
        'Your account has no business profile. Ask the administrator to provision your account.'
      )
      setLoading(false)
      return
    }

    setProfile(userProfile)

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(
        'id, name, sku, category, unit, selling_price, cost_price, current_quantity, reorder_level, is_archived'
      )
      .eq('is_archived', false)
      .order('name')

    if (productError) {
      setError(productError.message)
    } else {
      setProducts(productData || [])
    }

    setLoading(false)
  }, [session.user.id])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setError(error.message)
      return
    }

    navigate('/login')
  }

  function updateField(event) {
    const { name, value } = event.target
    setProductForm(previous => ({ ...previous, [name]: value }))
  }

  async function handleAddProduct(event) {
    event.preventDefault()
    setFormError('')

    if (!profile || profile.role !== 'owner') {
      setFormError('Only business owners can add products.')
      return
    }

    const sellingPrice = Number(productForm.selling_price)
    const costPrice = Number(productForm.cost_price)
    const quantity = 0
    const reorderLevel = Number(productForm.reorder_level)

    if (
      !productForm.name.trim() ||
      !productForm.sku.trim() ||
      !Number.isFinite(sellingPrice) ||
      !Number.isFinite(costPrice) ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(reorderLevel) ||
      sellingPrice < 0 ||
      costPrice < 0 ||
      quantity < 0 ||
      reorderLevel < 0
    ) {
      setFormError('Enter valid product details and non-negative numbers.')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('products').insert({
      business_id: profile.business_id,
      name: productForm.name.trim(),
      sku: productForm.sku.trim(),
      category: productForm.category.trim() || null,
      unit: productForm.unit,
      selling_price: sellingPrice,
      cost_price: costPrice,
      current_quantity: 0,
      reorder_level: reorderLevel
    })

    setSaving(false)

    if (error) {
      setFormError(
        error.code === '23505'
          ? 'This SKU already exists in your business.'
          : error.message
      )
      return
    }

    setProductForm(emptyProduct)
    setShowForm(false)
    await loadDashboard()
  }

  const activeProducts = products
  const lowStockProducts = activeProducts.filter(
    product =>
      Number(product.current_quantity) > 0 &&
      Number(product.current_quantity) <= Number(product.reorder_level)
  )
  const outOfStockProducts = activeProducts.filter(
    product => Number(product.current_quantity) === 0
  )

  const inventoryValue = activeProducts.reduce(
    (total, product) =>
      total +
      Number(product.cost_price) * Number(product.current_quantity),
    0
  )

  const filteredProducts = activeProducts.filter(product => {
    const query = search.toLowerCase()

    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query)
    )
  })

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <a href="/" className="dashboard-brand">
          <span className="brand-icon">S</span>
          StockPilot<span className="brand-ai">AI</span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <div className="sidebar-link active">
          <span>▦</span> Overview
        </div>

        <a className="sidebar-link" href="/products">
          <span>▦</span> Products
        </a>

        <a className="sidebar-link" href="/sales">
          <span>↗</span> Sales
        </a>

        <a className="sidebar-link" href="/invoices">
          <span>▤</span> Purchase invoices
        </a>

        <a className="sidebar-link" href="/forecasting">
          <span>⌁</span> Forecasting
        </a>

        <div className="sidebar-bottom">
          <div className="user-avatar">
            {(profile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <strong>{profile?.full_name || 'Loading user'}</strong>
            <span>{profile?.role || 'Account'}</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            ↪
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">WORKSPACE / OVERVIEW</span>
            <h1>Inventory overview</h1>
          </div>

          <div className="dashboard-top-actions">
            <span className="live-status">● Live data</span>
            <button className="logout-mobile" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        {error && <div className="dashboard-error">{error}</div>}

        {loading ? (
          <div className="dashboard-loading">Loading your inventory...</div>
        ) : profile ? (
          <>
            <section className="welcome-row">
              <div>
                <h2>Welcome, {profile.full_name} </h2>
                <p>Here's what's happening with your inventory.</p>
              </div>

              {profile.role === 'owner' && (
                <button
                  className="add-product-button"
                    onClick={() => navigate('/products')}
                >
                  + Add product
                </button>
              )}
            </section>

            <section className="metric-grid">
              <article className="metric-card">
                <span>Total products</span>
                <strong>{activeProducts.length}</strong>
                <small>Active inventory items</small>
              </article>

              <article className="metric-card warning-metric">
                <span>Low stock</span>
                <strong>{lowStockProducts.length}</strong>
                <small>At or below reorder level</small>
              </article>

              <article className="metric-card danger-metric">
                <span>Out of stock</span>
                <strong>{outOfStockProducts.length}</strong>
                <small>Items with zero quantity</small>
              </article>

              <article className="metric-card">
                <span>Inventory cost value</span>
                <strong>
                  ₹{inventoryValue.toLocaleString('en-IN', {
                    maximumFractionDigits: 2
                  })}
                </strong>
                <small>Based on cost price × quantity</small>
              </article>
            </section>

            <section className="inventory-section">
              <div className="inventory-heading">
                <div>
                  <h2>Product inventory</h2>
                  <p>Live product information from your business.</p>
                </div>

                <input
                  className="product-search"
                  type="search"
                  placeholder="Search name or SKU..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>

              <div className="table-wrapper">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Reorder level</th>
                      <th>Cost price</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map(product => {
                      const quantity = Number(product.current_quantity)
                      const reorder = Number(product.reorder_level)

                      const status =
                        quantity === 0
                          ? 'Out of stock'
                          : quantity <= reorder
                            ? 'Low stock'
                            : 'Healthy'

                      return (
                        <tr key={product.id}>
                          <td>
                            <strong>{product.name}</strong>
                            <small>{product.category || 'Uncategorized'}</small>
                          </td>
                          <td>{product.sku}</td>
                          <td>{quantity} {product.unit}</td>
                          <td>{reorder} {product.unit}</td>
                          <td>₹{Number(product.cost_price).toFixed(2)}</td>
                          <td>
                            <span className={`stock-status ${
                              status === 'Healthy'
                                ? 'status-healthy'
                                : status === 'Low stock'
                                  ? 'status-low'
                                  : 'status-out'
                            }`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-products">
                          {search
                            ? 'No matching products found.'
                            : 'No products yet. Add your first product to get started.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {showForm && (
              <div className="modal-backdrop">
                <form className="product-modal" onSubmit={handleAddProduct}>
                  <div className="modal-heading">
                    <div>
                      <h2>Add a product</h2>
                      <p>Add product details. Opening stock is recorded separately.</p>
                    </div>
                    <button
                      type="button"
                      className="modal-close"
                      onClick={() => setShowForm(false)}
                    >
                      ×
                    </button>
                  </div>

                  <label>Product name</label>
                  <input name="name" value={productForm.name}
                    onChange={updateField} required />

                  <label>SKU</label>
                  <input name="sku" value={productForm.sku}
                    onChange={updateField} required />

                  <label>Category</label>
                  <input name="category" value={productForm.category}
                    onChange={updateField} />

                  <label>Unit</label>
                  <select name="unit" value={productForm.unit}
                    onChange={updateField}>
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="litre">Litres</option>
                    <option value="box">Boxes</option>
                  </select>

                  <div className="form-grid">
                    <div>
                      <label>Selling price (₹)</label>
                      <input name="selling_price" type="number" min="0"
                        step="0.01" value={productForm.selling_price}
                        onChange={updateField} required />
                    </div>
                    <div>
                      <label>Cost price (₹)</label>
                      <input name="cost_price" type="number" min="0"
                        step="0.01" value={productForm.cost_price}
                        onChange={updateField} required />
                    </div>
                    <div>
                      <label>Reorder level</label>
                      <input name="reorder_level" type="number" min="0"
                        step="0.001" value={productForm.reorder_level}
                        onChange={updateField} required />
                    </div>
                  </div>

                  {formError && (
                    <div className="auth-error">{formError}</div>
                  )}

                  <button className="auth-submit" type="submit" disabled={saving}>
                    {saving ? 'Saving product...' : 'Save product'}
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="dashboard-error">
            Your account is not connected to a business profile.
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard

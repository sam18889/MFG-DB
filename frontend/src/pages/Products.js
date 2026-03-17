import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    product_name: '',
    plant_id: '',
    quality_status: 'onspec'
  });
  const [filterPlant, setFilterPlant] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, plantsRes] = await Promise.all([
        axios.get(`${API}/products`, { withCredentials: true }),
        axios.get(`${API}/plants`, { withCredentials: true })
      ]);
      setProducts(productsRes.data);
      setPlants(plantsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.product_id}`,
          {
            product_name: formData.product_name,
            quality_status: formData.quality_status
          },
          { withCredentials: true }
        );
        toast.success('Product updated successfully');
      } else {
        await axios.post(`${API}/products`, formData, { withCredentials: true });
        toast.success('Product created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name,
      plant_id: product.plant_id,
      quality_status: product.quality_status
    });
    setDialogOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await axios.delete(`${API}/products/${productId}`, { withCredentials: true });
      toast.success('Product deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      product_name: '',
      plant_id: '',
      quality_status: 'onspec'
    });
  };

  const getPlantName = (plantId) => {
    const plant = plants.find(p => p.plant_id === plantId);
    return plant ? plant.plant_name : 'Unknown';
  };

  const filteredProducts = filterPlant === 'all' 
    ? products 
    : products.filter(p => p.plant_id === filterPlant);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8" data-testid="products-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Products</h1>
            <p className="text-muted-foreground">Manage products and quality status</p>
          </div>
          <div className="flex gap-4">
            <Select value={filterPlant} onValueChange={setFilterPlant}>
              <SelectTrigger className="w-48" data-testid="filter-plant-select">
                <SelectValue placeholder="Filter by plant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plants</SelectItem>
                {plants.map(plant => (
                  <SelectItem key={plant.plant_id} value={plant.plant_id}>
                    {plant.plant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button data-testid="add-product-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="product-dialog">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="product_name">Product Name</Label>
                    <Input
                      id="product_name"
                      data-testid="product-name-input"
                      value={formData.product_name}
                      onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  {!editingProduct && (
                    <div>
                      <Label htmlFor="plant_id">Plant</Label>
                      <Select
                        value={formData.plant_id}
                        onValueChange={(value) => setFormData({...formData, plant_id: value})}
                        required
                      >
                        <SelectTrigger data-testid="product-plant-select">
                          <SelectValue placeholder="Select plant" />
                        </SelectTrigger>
                        <SelectContent>
                          {plants.map(plant => (
                            <SelectItem key={plant.plant_id} value={plant.plant_id}>
                              {plant.plant_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="quality_status">Quality Status</Label>
                    <Select
                      value={formData.quality_status}
                      onValueChange={(value) => setFormData({...formData, quality_status: value})}
                    >
                      <SelectTrigger data-testid="quality-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onspec">On Spec</SelectItem>
                        <SelectItem value="offspec">Off Spec</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" data-testid="submit-product-button">
                    {editingProduct ? 'Update Product' : 'Create Product'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full" data-testid="products-table">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Product Name</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Plant</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Quality Status</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Created</th>
                <th className="text-right px-6 py-4 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.product_id} className="border-t border-border" data-testid={`product-row-${product.product_id}`}>
                  <td className="px-6 py-4 font-medium text-foreground">{product.product_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{getPlantName(product.plant_id)}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge status-${product.quality_status}`} data-testid={`quality-status-${product.product_id}`}>
                      {product.quality_status === 'onspec' ? 'On Spec' : 'Off Spec'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(product.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        data-testid={`edit-product-${product.product_id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.product_id)}
                        data-testid={`delete-product-${product.product_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12" data-testid="no-products-message">
              <p className="text-muted-foreground">No products found. Add your first product to get started.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Products;
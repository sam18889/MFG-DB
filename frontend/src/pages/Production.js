import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Production = () => {
  const [records, setRecords] = useState([]);
  const [plants, setPlants] = useState([]);
  const [products, setProducts] = useState([]);
  const [incharges, setIncharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    plant_id: '',
    product_id: '',
    shift_incharge_id: '',
    shift_type: 'A',
    shift_production_value: '',
    shift_status: 'achieved',
    day_production_value: '',
    weekly_target: '',
    monthly_target: '',
    reasons_not_achieved: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const fetchData = async () => {
    try {
      const [recordsRes, plantsRes, productsRes, inchargesRes] = await Promise.all([
        axios.get(`${API}/production-records?date=${filterDate}`, { withCredentials: true }),
        axios.get(`${API}/plants`, { withCredentials: true }),
        axios.get(`${API}/products`, { withCredentials: true }),
        axios.get(`${API}/shift-incharges`, { withCredentials: true })
      ]);
      setRecords(recordsRes.data);
      setPlants(plantsRes.data);
      setProducts(productsRes.data);
      setIncharges(inchargesRes.data);
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
      const payload = {
        ...formData,
        shift_production_value: parseFloat(formData.shift_production_value),
        day_production_value: formData.day_production_value ? parseFloat(formData.day_production_value) : null,
        weekly_target: formData.weekly_target ? parseFloat(formData.weekly_target) : null,
        monthly_target: formData.monthly_target ? parseFloat(formData.monthly_target) : null
      };

      await axios.post(`${API}/production-records`, payload, { withCredentials: true });
      toast.success('Production record created successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save production record:', error);
      toast.error('Failed to save production record');
    }
  };

  const resetForm = () => {
    setFormData({
      plant_id: '',
      product_id: '',
      shift_incharge_id: '',
      shift_type: 'A',
      shift_production_value: '',
      shift_status: 'achieved',
      day_production_value: '',
      weekly_target: '',
      monthly_target: '',
      reasons_not_achieved: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const getPlantName = (plantId) => {
    const plant = plants.find(p => p.plant_id === plantId);
    return plant ? plant.plant_name : 'Unknown';
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.product_id === productId);
    return product ? product.product_name : 'Unknown';
  };

  const getInchargeName = (inchargeId) => {
    const incharge = incharges.find(i => i.incharge_id === inchargeId);
    return incharge ? incharge.name : 'Unknown';
  };

  const filteredProducts = formData.plant_id
    ? products.filter(p => p.plant_id === formData.plant_id)
    : products;

  const filteredIncharges = formData.plant_id
    ? incharges.filter(i => i.plant_id === formData.plant_id)
    : incharges;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading production records...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8" data-testid="production-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Production Tracking</h1>
            <p className="text-muted-foreground">Track production across shifts and targets</p>
          </div>
          <div className="flex gap-4">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              data-testid="filter-date-input"
              className="w-48"
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-production-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Production Record
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="production-dialog">
                <DialogHeader>
                  <DialogTitle>Add Production Record</DialogTitle>
                  <DialogDescription>
                    Create a new production record for a shift with targets and status
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="plant_id">Plant</Label>
                      <Select
                        value={formData.plant_id}
                        onValueChange={(value) => setFormData({...formData, plant_id: value, product_id: '', shift_incharge_id: ''})}
                        required
                      >
                        <SelectTrigger data-testid="production-plant-select">
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
                    <div>
                      <Label htmlFor="product_id">Product</Label>
                      <Select
                        value={formData.product_id}
                        onValueChange={(value) => setFormData({...formData, product_id: value})}
                        required
                        disabled={!formData.plant_id}
                      >
                        <SelectTrigger data-testid="production-product-select">
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredProducts.map(product => (
                            <SelectItem key={product.product_id} value={product.product_id}>
                              {product.product_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shift_incharge_id">Shift Incharge</Label>
                      <Select
                        value={formData.shift_incharge_id}
                        onValueChange={(value) => setFormData({...formData, shift_incharge_id: value})}
                        required
                        disabled={!formData.plant_id}
                      >
                        <SelectTrigger data-testid="production-incharge-select">
                          <SelectValue placeholder="Select incharge" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredIncharges.map(incharge => (
                            <SelectItem key={incharge.incharge_id} value={incharge.incharge_id}>
                              {incharge.name} - Shift {incharge.shift_type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="shift_type">Shift</Label>
                      <Select
                        value={formData.shift_type}
                        onValueChange={(value) => setFormData({...formData, shift_type: value})}
                      >
                        <SelectTrigger data-testid="production-shift-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">Shift A (06:00-14:00)</SelectItem>
                          <SelectItem value="B">Shift B (14:00-22:00)</SelectItem>
                          <SelectItem value="C">Shift C (22:00-06:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        data-testid="production-date-input"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="shift_status">Shift Status</Label>
                      <Select
                        value={formData.shift_status}
                        onValueChange={(value) => setFormData({...formData, shift_status: value})}
                      >
                        <SelectTrigger data-testid="shift-status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="achieved">Achieved</SelectItem>
                          <SelectItem value="not_achieved">Not Achieved</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shift_production_value">Shift Production Value</Label>
                      <Input
                        id="shift_production_value"
                        type="number"
                        step="0.01"
                        data-testid="shift-production-input"
                        value={formData.shift_production_value}
                        onChange={(e) => setFormData({...formData, shift_production_value: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="day_production_value">Day Production Value</Label>
                      <Input
                        id="day_production_value"
                        type="number"
                        step="0.01"
                        data-testid="day-production-input"
                        value={formData.day_production_value}
                        onChange={(e) => setFormData({...formData, day_production_value: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weekly_target">Weekly Target</Label>
                      <Input
                        id="weekly_target"
                        type="number"
                        step="0.01"
                        data-testid="weekly-target-input"
                        value={formData.weekly_target}
                        onChange={(e) => setFormData({...formData, weekly_target: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthly_target">Monthly Target</Label>
                      <Input
                        id="monthly_target"
                        type="number"
                        step="0.01"
                        data-testid="monthly-target-input"
                        value={formData.monthly_target}
                        onChange={(e) => setFormData({...formData, monthly_target: e.target.value})}
                      />
                    </div>
                  </div>
                  {formData.shift_status === 'not_achieved' && (
                    <div>
                      <Label htmlFor="reasons_not_achieved">Reasons Not Achieved</Label>
                      <Textarea
                        id="reasons_not_achieved"
                        data-testid="reasons-not-achieved-input"
                        value={formData.reasons_not_achieved}
                        onChange={(e) => setFormData({...formData, reasons_not_achieved: e.target.value})}
                        placeholder="Enter reasons..."
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full" data-testid="submit-production-button">
                    Create Production Record
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full" data-testid="production-table">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Date</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Plant</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Product</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Shift</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Incharge</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Production</th>
                <th className="text-left px-6 py-4 font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.record_id} className="border-t border-border" data-testid={`production-row-${record.record_id}`}>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-foreground">{getPlantName(record.plant_id)}</td>
                  <td className="px-6 py-4 text-foreground">{getProductName(record.product_id)}</td>
                  <td className="px-6 py-4 font-semibold text-foreground">Shift {record.shift_type}</td>
                  <td className="px-6 py-4 text-muted-foreground">{getInchargeName(record.shift_incharge_id)}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{record.shift_production_value}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge status-${record.shift_status}`} data-testid={`production-status-${record.record_id}`}>
                      {record.shift_status === 'achieved' ? 'Achieved' : 
                       record.shift_status === 'not_achieved' ? 'Not Achieved' : 'In Progress'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {records.length === 0 && (
            <div className="text-center py-12" data-testid="no-production-message">
              <p className="text-muted-foreground">No production records found for this date.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Production;
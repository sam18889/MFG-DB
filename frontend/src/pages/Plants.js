import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Plants = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlant, setEditingPlant] = useState(null);
  const [plantName, setPlantName] = useState('');

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const response = await axios.get(`${API}/plants`, {
        withCredentials: true
      });
      setPlants(response.data);
    } catch (error) {
      console.error('Failed to fetch plants:', error);
      toast.error('Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlant) {
        await axios.put(`${API}/plants/${editingPlant.plant_id}`, 
          { plant_name: plantName },
          { withCredentials: true }
        );
        toast.success('Plant updated successfully');
      } else {
        await axios.post(`${API}/plants`, 
          { plant_name: plantName },
          { withCredentials: true }
        );
        toast.success('Plant created successfully');
      }
      setDialogOpen(false);
      setPlantName('');
      setEditingPlant(null);
      fetchPlants();
    } catch (error) {
      console.error('Failed to save plant:', error);
      toast.error('Failed to save plant');
    }
  };

  const handleEdit = (plant) => {
    setEditingPlant(plant);
    setPlantName(plant.plant_name);
    setDialogOpen(true);
  };

  const handleDelete = async (plantId) => {
    if (!window.confirm('Are you sure you want to delete this plant?')) return;
    
    try {
      await axios.delete(`${API}/plants/${plantId}`, {
        withCredentials: true
      });
      toast.success('Plant deleted successfully');
      fetchPlants();
    } catch (error) {
      console.error('Failed to delete plant:', error);
      toast.error('Failed to delete plant');
    }
  };

  const handleDialogChange = (open) => {
    setDialogOpen(open);
    if (!open) {
      setEditingPlant(null);
      setPlantName('');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading plants...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8" data-testid="plants-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Plants</h1>
            <p className="text-muted-foreground">Manage your manufacturing plants</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button data-testid="add-plant-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Plant
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="plant-dialog">
              <DialogHeader>
                <DialogTitle>{editingPlant ? 'Edit Plant' : 'Add New Plant'}</DialogTitle>
                <DialogDescription>
                  {editingPlant ? 'Update plant information' : 'Create a new manufacturing plant'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="plant_name">Plant Name</Label>
                  <Input
                    id="plant_name"
                    data-testid="plant-name-input"
                    value={plantName}
                    onChange={(e) => setPlantName(e.target.value)}
                    placeholder="Enter plant name"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-plant-button">
                  {editingPlant ? 'Update Plant' : 'Create Plant'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plants.map((plant) => (
            <div key={plant.plant_id} className="stat-card" data-testid={`plant-card-${plant.plant_id}`}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-foreground">{plant.plant_name}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(plant)}
                    data-testid={`edit-plant-${plant.plant_id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(plant.plant_id)}
                    data-testid={`delete-plant-${plant.plant_id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(plant.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}

          {plants.length === 0 && (
            <div className="col-span-full text-center py-12" data-testid="no-plants-message">
              <p className="text-muted-foreground mb-4">No plants found. Add your first plant to get started.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Plants;
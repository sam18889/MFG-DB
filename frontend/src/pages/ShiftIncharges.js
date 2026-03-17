import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, MessageSquare, Calendar } from 'lucide-react';
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

const ShiftIncharges = () => {
  const [incharges, setIncharges] = useState([]);
  const [plants, setPlants] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [editingIncharge, setEditingIncharge] = useState(null);
  const [selectedIncharge, setSelectedIncharge] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    plant_id: '',
    shift_type: 'A',
    crew_members: '',
    follow_up_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inchargesRes, plantsRes] = await Promise.all([
        axios.get(`${API}/shift-incharges`, { withCredentials: true }),
        axios.get(`${API}/plants`, { withCredentials: true })
      ]);
      setIncharges(inchargesRes.data);
      setPlants(plantsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async (inchargeId) => {
    try {
      const response = await axios.get(`${API}/notes/${inchargeId}`, { withCredentials: true });
      setNotes(prev => ({ ...prev, [inchargeId]: response.data }));
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        crew_members: formData.crew_members.split(',').map(m => m.trim()).filter(m => m)
      };

      if (editingIncharge) {
        await axios.put(`${API}/shift-incharges/${editingIncharge.incharge_id}`, payload, { withCredentials: true });
        toast.success('Shift incharge updated successfully');
      } else {
        await axios.post(`${API}/shift-incharges`, payload, { withCredentials: true });
        toast.success('Shift incharge created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save shift incharge:', error);
      toast.error('Failed to save shift incharge');
    }
  };

  const handleEdit = (incharge) => {
    setEditingIncharge(incharge);
    setFormData({
      name: incharge.name,
      email: incharge.email,
      plant_id: incharge.plant_id,
      shift_type: incharge.shift_type,
      crew_members: incharge.crew_members.join(', '),
      follow_up_date: incharge.follow_up_date || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (inchargeId) => {
    if (!window.confirm('Are you sure you want to delete this shift incharge?')) return;
    
    try {
      await axios.delete(`${API}/shift-incharges/${inchargeId}`, { withCredentials: true });
      toast.success('Shift incharge deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete shift incharge:', error);
      toast.error('Failed to delete shift incharge');
    }
  };

  const handleNotesOpen = (incharge) => {
    setSelectedIncharge(incharge);
    fetchNotes(incharge.incharge_id);
    setNotesDialogOpen(true);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      await axios.post(`${API}/notes`, 
        {
          shift_incharge_id: selectedIncharge.incharge_id,
          note_text: newNote
        },
        { withCredentials: true }
      );
      toast.success('Note added successfully');
      setNewNote('');
      fetchNotes(selectedIncharge.incharge_id);
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/notes/${noteId}`, { withCredentials: true });
      toast.success('Note deleted successfully');
      fetchNotes(selectedIncharge.incharge_id);
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  const resetForm = () => {
    setEditingIncharge(null);
    setFormData({
      name: '',
      email: '',
      plant_id: '',
      shift_type: 'A',
      crew_members: '',
      follow_up_date: ''
    });
  };

  const getPlantName = (plantId) => {
    const plant = plants.find(p => p.plant_id === plantId);
    return plant ? plant.plant_name : 'Unknown';
  };

  const getShiftTime = (shift) => {
    const times = {
      'A': '06:00-14:00',
      'B': '14:00-22:00',
      'C': '22:00-06:00'
    };
    return times[shift] || '';
  };

  const isOverdue = (followUpDate) => {
    if (!followUpDate) return false;
    return new Date(followUpDate) < new Date();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading shift incharges...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8" data-testid="shift-incharges-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Shift Incharges</h1>
            <p className="text-muted-foreground">Manage shift incharges and crew members</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-incharge-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Shift Incharge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" data-testid="incharge-dialog">
              <DialogHeader>
                <DialogTitle>{editingIncharge ? 'Edit Shift Incharge' : 'Add New Shift Incharge'}</DialogTitle>
                <DialogDescription>
                  {editingIncharge ? 'Update shift incharge details and crew information' : 'Create a new shift incharge with crew members'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      data-testid="incharge-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      data-testid="incharge-email-input"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="plant_id">Plant</Label>
                    <Select
                      value={formData.plant_id}
                      onValueChange={(value) => setFormData({...formData, plant_id: value})}
                      required
                    >
                      <SelectTrigger data-testid="incharge-plant-select">
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
                    <Label htmlFor="shift_type">Shift</Label>
                    <Select
                      value={formData.shift_type}
                      onValueChange={(value) => setFormData({...formData, shift_type: value})}
                    >
                      <SelectTrigger data-testid="shift-type-select">
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
                <div>
                  <Label htmlFor="crew_members">Crew Members (comma separated)</Label>
                  <Input
                    id="crew_members"
                    data-testid="crew-members-input"
                    value={formData.crew_members}
                    onChange={(e) => setFormData({...formData, crew_members: e.target.value})}
                    placeholder="John Doe, Jane Smith, Bob Johnson"
                  />
                </div>
                <div>
                  <Label htmlFor="follow_up_date">Follow-up Date</Label>
                  <Input
                    id="follow_up_date"
                    type="date"
                    data-testid="follow-up-date-input"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-incharge-button">
                  {editingIncharge ? 'Update Shift Incharge' : 'Create Shift Incharge'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {incharges.map((incharge) => (
            <div key={incharge.incharge_id} className="stat-card" data-testid={`incharge-card-${incharge.incharge_id}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{incharge.name}</h3>
                  <p className="text-sm text-muted-foreground">{incharge.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNotesOpen(incharge)}
                    data-testid={`notes-button-${incharge.incharge_id}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(incharge)}
                    data-testid={`edit-incharge-${incharge.incharge_id}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(incharge.incharge_id)}
                    data-testid={`delete-incharge-${incharge.incharge_id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Plant:</span>
                  <span className="text-sm text-foreground">{getPlantName(incharge.plant_id)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Shift:</span>
                  <span className="text-sm font-semibold text-foreground">
                    Shift {incharge.shift_type} ({getShiftTime(incharge.shift_type)})
                  </span>
                </div>
                {incharge.crew_members.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Crew:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {incharge.crew_members.map((member, idx) => (
                        <span key={idx} className="text-xs bg-secondary px-2 py-1 rounded text-foreground">
                          {member}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {incharge.follow_up_date && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Follow-up:</span>
                    <span className={`text-sm font-semibold ${isOverdue(incharge.follow_up_date) ? 'overdue' : 'text-foreground'}`}>
                      {new Date(incharge.follow_up_date).toLocaleDateString()}
                      {isOverdue(incharge.follow_up_date) && ' (Overdue)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {incharges.length === 0 && (
            <div className="col-span-full text-center py-12" data-testid="no-incharges-message">
              <p className="text-muted-foreground">No shift incharges found. Add your first shift incharge to get started.</p>
            </div>
          )}
        </div>

        {/* Notes Dialog */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent className="max-w-2xl" data-testid="notes-dialog">
            <DialogHeader>
              <DialogTitle>Notes - {selectedIncharge?.name}</DialogTitle>
              <DialogDescription>
                Add and manage notes for this shift incharge
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  data-testid="new-note-input"
                  className="flex-1"
                />
                <Button onClick={handleAddNote} data-testid="add-note-button">
                  Add
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notes[selectedIncharge?.incharge_id]?.map((note) => (
                  <div key={note.note_id} className="bg-secondary p-4 rounded-lg" data-testid={`note-${note.note_id}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.note_id)}
                        data-testid={`delete-note-${note.note_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground">{note.note_text}</p>
                  </div>
                ))}
                {(!notes[selectedIncharge?.incharge_id] || notes[selectedIncharge?.incharge_id]?.length === 0) && (
                  <p className="text-center text-muted-foreground py-8" data-testid="no-notes-message">No notes yet. Add your first note above.</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ShiftIncharges;
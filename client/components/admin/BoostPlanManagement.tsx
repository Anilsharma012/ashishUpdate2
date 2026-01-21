import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Plus, Edit, Trash2, Zap, Clock } from "lucide-react";

interface BoostPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
  active: boolean;
  sortOrder?: number;
  createdAt: string;
}

export default function BoostPlanManagement() {
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BoostPlan | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    duration: 24,
    features: "",
    active: true,
    sortOrder: 1,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get("/boost-plans");
      if (res.data.success) {
        setPlans(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching boost plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    
    const planData = {
      ...formData,
      features: formData.features.split("\n").filter((f) => f.trim()),
    };

    try {
      if (editingPlan) {
        await api.put(`/boost-plans/${editingPlan._id}`, planData, token);
      } else {
        await api.post("/boost-plans", planData, token);
      }
      setDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      console.error("Error saving boost plan:", error);
    }
  };

  const handleEdit = (plan: BoostPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      duration: plan.duration,
      features: plan.features.join("\n"),
      active: plan.active,
      sortOrder: plan.sortOrder || 1,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this boost plan?")) return;
    
    const token = localStorage.getItem("token");
    try {
      await api.delete(`/boost-plans/${id}`, token);
      fetchPlans();
    } catch (error) {
      console.error("Error deleting boost plan:", error);
    }
  };

  const toggleActive = async (plan: BoostPlan) => {
    const token = localStorage.getItem("token");
    try {
      await api.put(`/boost-plans/${plan._id}`, { active: !plan.active }, token);
      fetchPlans();
    } catch (error) {
      console.error("Error toggling plan status:", error);
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      price: 0,
      duration: 24,
      features: "",
      active: true,
      sortOrder: 1,
    });
  };

  if (loading) {
    return <div className="p-6">Loading boost plans...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Boost Up Plans
          </h1>
          <p className="text-gray-600">Manage boost plans for property listings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Boost Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Edit Boost Plan" : "Add New Boost Plan"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 24 Hour Boost"
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Plan description"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    min={0}
                    required
                  />
                </div>
                <div>
                  <Label>Duration (hours)</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <Textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  placeholder="Featured in homepage&#10;Priority in search&#10;Highlighted listing"
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label>Active</Label>
              </div>
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                {editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan._id} className={`${!plan.active ? "opacity-60" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  {plan.name}
                </CardTitle>
                <Badge variant={plan.active ? "default" : "secondary"}>
                  {plan.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">{plan.description}</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-2xl font-bold text-red-600">₹{plan.price}</div>
                <div className="flex items-center text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {plan.duration} hours
                </div>
              </div>
              <ul className="text-sm space-y-1 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(plan)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(plan)}
                >
                  {plan.active ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(plan._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-12">
          <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No boost plans yet. Add your first boost plan.</p>
        </div>
      )}
    </div>
  );
}

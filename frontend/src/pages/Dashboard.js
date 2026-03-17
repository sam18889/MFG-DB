import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Factory, Package, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import Layout from '@/components/Layout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/metrics`, {
        withCredentials: true
      });
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      icon: Factory,
      label: 'Total Plants',
      value: metrics?.total_plants || 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      testId: 'total-plants-stat'
    },
    {
      icon: Package,
      label: 'Total Products',
      value: metrics?.total_products || 0,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      testId: 'total-products-stat'
    },
    {
      icon: Users,
      label: 'Shift Incharges',
      value: metrics?.total_shift_incharges || 0,
      color: 'text-green-600',
      bg: 'bg-green-50',
      testId: 'total-incharges-stat'
    },
    {
      icon: TrendingUp,
      label: "Today's Production",
      value: metrics?.today_production?.toFixed(2) || '0.00',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      testId: 'today-production-stat'
    },
  ];

  return (
    <Layout>
      <div className="p-8" data-testid="dashboard-page">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your manufacturing operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card" data-testid={stat.testId}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quality Status and Follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="stat-card" data-testid="quality-status-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quality Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">On Spec</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{metrics?.onspec_count || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-900">Off Spec</span>
                </div>
                <span className="text-2xl font-bold text-red-600">{metrics?.offspec_count || 0}</span>
              </div>
            </div>
          </div>

          <div className="stat-card" data-testid="overdue-followups-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Follow-up Status</h3>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-900">Overdue Follow-ups</span>
              </div>
              <span className="text-2xl font-bold text-amber-600">{metrics?.overdue_followups || 0}</span>
            </div>
          </div>
        </div>

        {/* Shift Performance Chart */}
        <div className="stat-card" data-testid="shift-performance-chart">
          <h3 className="text-lg font-semibold text-foreground mb-6">Shift Performance (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics?.shift_performance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Bar dataKey="shift_a" fill="#3B82F6" name="Shift A (06:00-14:00)" />
              <Bar dataKey="shift_b" fill="#10B981" name="Shift B (14:00-22:00)" />
              <Bar dataKey="shift_c" fill="#F59E0B" name="Shift C (22:00-06:00)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
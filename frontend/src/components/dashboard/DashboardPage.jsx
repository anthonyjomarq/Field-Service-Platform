import React from "react";
import { useQuery } from "react-query";

import { Card } from "../components/common/Card";
import { ActivityFeed } from "../components/dashboard/ActivityFeed";
import { Dashboard } from "../components/dashboard/Dashboard";
import { QuickActions } from "../components/dashboard/QuickActions";
import { StatsCard } from "../components/dashboard/StatsCard";
import { dashboardAPI } from "../services/dashboard.service";

const DashboardPage = () => {
  const { data: stats, loading: statsLoading } = useQuery(
    "dashboardStats",
    dashboardAPI.getStats
  );

  const { data: activities, loading: activitiesLoading } = useQuery(
    "recentActivities",
    dashboardAPI.getRecentActivities
  );

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <QuickActions />
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          change={stats?.customerChange}
          loading={statsLoading}
          icon="👥"
        />
        <StatsCard
          title="Active Routes"
          value={stats?.activeRoutes || 0}
          change={stats?.routeChange}
          loading={statsLoading}
          icon="🚛"
        />
        <StatsCard
          title="Completed Today"
          value={stats?.completedToday || 0}
          change={stats?.completionChange}
          loading={statsLoading}
          icon="✅"
        />
        <StatsCard
          title="Revenue MTD"
          value={stats?.revenueMTD || 0}
          change={stats?.revenueChange}
          loading={statsLoading}
          icon="💰"
          format="currency"
        />
      </div>

      <div className="dashboard-content">
        <div className="content-main">
          <Card>
            <Card.Header>
              <h2>Route Performance</h2>
            </Card.Header>
            <Card.Body>
              <Dashboard />
            </Card.Body>
          </Card>
        </div>

        <div className="content-sidebar">
          <Card>
            <Card.Header>
              <h2>Recent Activity</h2>
            </Card.Header>
            <Card.Body>
              <ActivityFeed
                activities={activities || []}
                loading={activitiesLoading}
              />
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

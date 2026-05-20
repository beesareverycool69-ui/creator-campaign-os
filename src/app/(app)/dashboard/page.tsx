import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getDashboardStats,
  getLeadFunnelStats,
  getOutreachStats,
  getTodaysTasks,
  getRecentActivity,
  getBrandPerformance,
  getSetupProgress,
} from "@/lib/actions/dashboard";
import {
  Users,
  Building2,
  Megaphone,
  TrendingUp,
  Send,
  MessageCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Mail,
  UserPlus,
} from "lucide-react";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const funnel = await getLeadFunnelStats();
  const outreach = await getOutreachStats();
  const tasks = await getTodaysTasks();
  const activity = await getRecentActivity();
  const brandPerf = await getBrandPerformance();
  const setup = await getSetupProgress();

  const funnelSteps = [
    { key: "discovered", label: "Discovered", color: "bg-muted-foreground" },
    { key: "contacted", label: "Contacted", color: "bg-secondary/600" },
    { key: "engaged", label: "Engaged", color: "bg-primary" },
    { key: "active", label: "Active", color: "bg-green-500" },
  ];

  const statusColors: Record<string, string> = {
    discovered: "bg-muted text-muted-foreground",
    researching: "bg-yellow-100 text-primary",
    qualified: "bg-blue-100 text-primary",
    contacted: "bg-secondary text-primary",
    engaged: "bg-secondary text-primary",
    active: "bg-green-100 text-primary",
  };

  const setupSteps = [
    {
      label: "Create your first brand",
      description: "Add the brand you want to run outreach for.",
      complete: setup.hasBrand,
      href: setup.hasBrand && setup.firstBrandId ? `/brands/${setup.firstBrandId}` : "/brands/new",
      action: setup.hasBrand ? "View Brand" : "Create Brand",
    },
    {
      label: "Add products",
      description: "Prepare the products creators may receive or promote.",
      complete: setup.hasProducts,
      href: setup.firstBrandId ? `/brands/${setup.firstBrandId}#products` : "/brands/new",
      action: setup.hasProducts ? "View Products" : "Add Product",
    },
    {
      label: "Find creators",
      description: "Build a lead list for your brand.",
      complete: setup.hasCreators,
      href: setup.firstBrandId ? `/brands/${setup.firstBrandId}/leads` : "/brands/new",
      action: setup.hasCreators ? "View Leads" : "Find Creators",
    },
    {
      label: "Send outreach",
      description: "Start DMs once leads are ready.",
      complete: setup.hasOutreach,
      href: setup.firstBrandId ? `/brands/${setup.firstBrandId}/send-dms` : "/brands/new",
      action: setup.hasOutreach ? "View Outreach" : "Send DMs",
    },
    {
      label: "Start a campaign",
      description: "Move accepted creators into a campaign workflow.",
      complete: setup.hasCampaign,
      href: setup.hasCampaign
        ? "/campaigns"
        : setup.firstBrandId
          ? `/campaigns/new?brandId=${setup.firstBrandId}`
          : "/campaigns/new",
      action: setup.hasCampaign ? "View Campaigns" : "New Campaign",
    },
  ];
  const setupComplete = setupSteps.every((step) => step.complete);
  const showFirstOutreachNextStep =
    setup.hasBrand &&
    setup.hasProducts &&
    setup.hasCreators &&
    setup.readyForOutreachCount > 0 &&
    !!setup.nextOutreachBrandId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your creator outreach command center
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/brands/new">
            <Button variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              New Brand
            </Button>
          </Link>
          <Link href="/campaigns/new">
            <Button>
              <Megaphone className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {showFirstOutreachNextStep && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send your first DMs
            </CardTitle>
            <CardDescription>
              {setup.readyForOutreachCount} lead{setup.readyForOutreachCount === 1 ? "" : "s"} ready for outreach.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Your brand, product, and lead list are set up. Start outreach from the brand DM queue.
            </p>
            <Link href={`/brands/${setup.nextOutreachBrandId}/send-dms`}>
              <Button>
                Send DMs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!setupComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Get set up
            </CardTitle>
            <CardDescription>
              Follow these steps to launch your first creator outreach workflow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {setupSteps.map((step, index) => (
                <Link
                  key={step.label}
                  href={step.href}
                  className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      step.complete ? "bg-green-100 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {step.complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm">{step.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1 min-h-8">
                    {step.description}
                  </p>
                  <div className="mt-3 text-xs font-medium text-primary">
                    {step.action} →
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Creator Profiles</p>
                <p className="text-3xl font-bold">{stats.creators}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Brands</p>
                <p className="text-3xl font-bold">{stats.brands}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads Added</p>
                <p className="text-3xl font-bold">{stats.totalLeads}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                <p className="text-3xl font-bold">{stats.activeCampaigns}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/30 flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Lead Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Lead Funnel
            </CardTitle>
            <CardDescription>Your outreach pipeline at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => {
                const value = funnel[step.key] || 0;
                const maxValue = Math.max(...funnelSteps.map(s => funnel[s.key] || 0), 1);
                const width = Math.max((value / maxValue) * 100, 5);
                
                return (
                  <div key={step.key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{step.label}</span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${step.color} rounded-full transition-all`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Conversion rate */}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <span className="text-lg font-semibold">
                {stats.totalLeads > 0 
                  ? Math.round(((funnel.active || 0) / stats.totalLeads) * 100)
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Outreach Stats */}
        {outreach.hasSentOutreach && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Outreach Performance
              </CardTitle>
              <CardDescription>Message delivery and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold">{outreach.sentOutreachTotal}</p>
                  <p className="text-sm text-muted-foreground">Messages Sent</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold">{outreach.repliedCount}</p>
                  <p className="text-sm text-muted-foreground">Replies</p>
                </div>
                <div className="text-center p-4 bg-secondary/60 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{outreach.openRate}%</p>
                  <p className="text-sm text-muted-foreground">Open Rate</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{outreach.replyRate}%</p>
                  <p className="text-sm text-muted-foreground">Reply Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Today&apos;s Tasks
            </CardTitle>
            <CardDescription>Your outreach queue for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* DMs to Send */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  DMs to Send
                </h4>
                <Badge variant="secondary">{tasks.toContact.length}</Badge>
              </div>
              {tasks.toContact.length === 0 ? (
                <EmptyState
                  title="No DMs queued"
                  description="You are caught up. Qualify more creators when you are ready."
                  actionHref="/brands"
                  actionLabel="View Brands"
                />
              ) : (
                <div className="space-y-2">
                  {tasks.toContact.slice(0, 3).map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/brands/${lead.brandId}/send-dms`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{lead.creatorName}</p>
                        <p className="text-xs text-muted-foreground">{lead.brandName}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                  {tasks.toContact.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{tasks.toContact.length - 3} more
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Follow-ups */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Follow-ups Due
                </h4>
                <Badge variant="secondary">{tasks.followUps.length}</Badge>
              </div>
              {tasks.followUps.length === 0 ? (
                <EmptyState
                  title="No follow-ups due"
                  description="Nothing needs a nudge today."
                  actionHref="/brands"
                  actionLabel="View Brands"
                />
              ) : (
                <div className="space-y-2">
                  {tasks.followUps.slice(0, 3).map((lead) => (
                    <Link
                      key={lead.id}
                      href={`/brands/${lead.brandId}/follow-ups`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium text-sm">{lead.creatorName}</p>
                        <p className="text-xs text-muted-foreground">{lead.brandName}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates across your brands</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.recentLeads.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Add creators to a brand to start building your outreach history."
                actionHref="/brands"
                actionLabel="View Brands"
              />
            ) : (
              <div className="space-y-3">
                {activity.recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {lead.creatorName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{lead.creatorName}</p>
                        <p className="text-xs text-muted-foreground">{lead.brandName}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[lead.status] || "bg-gray-100"}>
                      {lead.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Brands */}
      {brandPerf.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Top Brands by Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {brandPerf.map((brand, i) => (
                <Link
                  key={brand.brandId}
                  href={`/brands/${brand.brandId}`}
                  className="p-4 rounded-lg border hover:shadow-md transition-shadow text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 text-lg font-bold">
                    {brand.brandName.charAt(0)}
                  </div>
                  <p className="font-medium text-sm truncate">{brand.brandName}</p>
                  <p className="text-2xl font-bold mt-1">{brand.totalLeads}</p>
                  <p className="text-xs text-muted-foreground">leads</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/brands/new">
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            </Link>
            <Link href="/campaigns/new">
              <Button variant="outline">
                <Megaphone className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </Link>
            <Link href="/brands">
              <Button variant="ghost">View All Brands</Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="ghost">View All Campaigns</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

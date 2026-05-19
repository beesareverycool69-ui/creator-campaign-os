import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getOverallStats,
  getTopCreators,
  getCampaignPerformance,
  getDailyStats,
  getPendingConversions,
  updateConversionStatus,
} from "@/lib/actions/analytics";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Trophy,
} from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function AnalyticsPage() {
  const [stats, topCreators, campaignPerf, dailyStats, pendingConversions] = await Promise.all([
    getOverallStats(),
    getTopCreators(10),
    getCampaignPerformance(),
    getDailyStats(30),
    getPendingConversions(),
  ]);

  // Calculate trend (compare last 7 days to previous 7 days)
  const last7Days = dailyStats.slice(-7);
  const prev7Days = dailyStats.slice(-14, -7);
  const last7Revenue = last7Days.reduce((sum, d) => sum + d.revenue, 0);
  const prev7Revenue = prev7Days.reduce((sum, d) => sum + d.revenue, 0);
  const revenueTrend = prev7Revenue > 0 
    ? ((last7Revenue - prev7Revenue) / prev7Revenue) * 100 
    : 0;

  // Calculate max for chart scaling
  const maxRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your affiliate performance and ROI
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                {revenueTrend !== 0 && (
                  <div className={`flex items-center text-sm mt-1 ${revenueTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueTrend > 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {Math.abs(revenueTrend).toFixed(1)}% vs last week
                  </div>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Commissions</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.totalCommission)}</p>
                <p className="text-sm text-muted-foreground mt-1">Owed to creators</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversions</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalConversions)}</p>
                <p className="text-sm text-muted-foreground mt-1">Total orders</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Order Value</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.conversionRate.toFixed(1)}% conversion rate
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Conversions</CardTitle>
          <CardDescription>Review webhook conversions before they count toward revenue totals.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingConversions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending conversions to review.</p>
          ) : (
            <div className="space-y-3">
              {pendingConversions.map((conversion) => (
                <div
                  key={conversion.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="grid gap-1 text-sm md:grid-cols-3 md:gap-x-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Order</p>
                      <p className="font-medium">{conversion.orderId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Creator</p>
                      <p className="font-medium">{conversion.creatorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Campaign</p>
                      <p className="font-medium">{conversion.campaignName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Code</p>
                      <p className="font-medium">{conversion.affiliateCode || "No code"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Value / Commission</p>
                      <p className="font-medium">
                        {formatCurrency(conversion.orderValue)} / {formatCurrency(conversion.commission)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Converted</p>
                      <p className="font-medium">{formatDate(conversion.convertedAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 md:shrink-0">
                    <form action={updateConversionStatus}>
                      <input type="hidden" name="id" value={conversion.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <Button size="sm" type="submit">Confirm</Button>
                    </form>
                    <form action={updateConversionStatus}>
                      <input type="hidden" name="id" value={conversion.id} />
                      <input type="hidden" name="status" value="rejected" />
                      <Button size="sm" variant="outline" type="submit">Reject</Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <EmptyState
              title="No revenue data yet"
              description="Conversions will appear here once affiliate tracking starts."
              actionHref="/campaigns"
              actionLabel="View Campaigns"
            />
          ) : (
            <div className="h-48 flex items-end gap-1">
              {dailyStats.map((day, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/20 hover:bg-primary/30 rounded-t transition-colors relative group"
                  style={{ height: `${(day.revenue / maxRevenue) * 100}%`, minHeight: '4px' }}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    <p className="font-medium">{formatCurrency(day.revenue)}</p>
                    <p className="text-muted-foreground">{day.conversions} orders</p>
                    <p className="text-muted-foreground">{day.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Creators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Performing Creators
            </CardTitle>
            <CardDescription>Ranked by revenue generated</CardDescription>
          </CardHeader>
          <CardContent>
            {topCreators.length === 0 ? (
              <EmptyState
                title="No creator performance yet"
                description="Creators will rank here after tracked conversions."
                actionHref="/campaigns"
                actionLabel="View Campaigns"
              />
            ) : (
              <div className="space-y-3">
                {topCreators.map((creator, i) => (
                  <div
                    key={creator.campaignCreatorId}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-yellow-100 text-yellow-700' :
                        i === 1 ? 'bg-gray-100 text-gray-700' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{creator.creatorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {creator.affiliateCode || 'No code'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(creator.revenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {creator.conversions} sales
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>Revenue by campaign</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignPerf.length === 0 ? (
              <EmptyState
                title="No campaign performance yet"
                description="Create a campaign and add creators to start tracking results."
                actionHref="/campaigns/new"
                actionLabel="+ New Campaign"
              />
            ) : (
              <div className="space-y-3">
                {campaignPerf.slice(0, 5).map((campaign) => (
                  <Link
                    key={campaign.campaignId}
                    href={`/campaigns/${campaign.campaignId}`}
                    className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{campaign.campaignName}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.brandName} • {campaign.creators} creators
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(campaign.revenue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.conversions} conversions
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Webhook Setup Info */}
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Store</CardTitle>
          <CardDescription>Track conversions automatically when customers use promo codes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shopify Setup */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#96bf48] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h3 className="font-semibold">Shopify</h3>
              <Badge variant="secondary">Recommended</Badge>
            </div>
            <ol className="text-sm space-y-2 mb-3">
              <li><strong>1.</strong> Go to Shopify Admin → Settings → Notifications</li>
              <li><strong>2.</strong> Scroll to Webhooks → Create webhook</li>
              <li><strong>3.</strong> Event: <code className="bg-muted px-1 rounded">Order creation</code></li>
              <li><strong>4.</strong> URL: Copy the webhook URL below</li>
              <li><strong>5.</strong> Format: JSON → Save</li>
            </ol>
            <div className="bg-muted/50 rounded p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Shopify Webhook URL:</p>
              <code className="text-sm break-all">
                {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhooks/shopify
              </code>
            </div>
          </div>

          {/* Generic Webhook */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Other Platforms (WooCommerce, Custom)</h3>
            <div className="bg-muted/50 rounded p-3 mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Generic Webhook URL:</p>
              <code className="text-sm break-all">
                {process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'}/api/webhooks/conversion
              </code>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Send a POST request with:</p>
            <pre className="text-xs bg-muted/50 px-3 py-2 rounded overflow-x-auto">
{`{
  "order_id": "ORD-12345",
  "order_value": 99.99,
  "promo_code": "CREATOR15",
  "currency": "USD"
}`}
            </pre>
          </div>

          <p className="text-sm text-muted-foreground">
            💡 Once connected, conversions appear here automatically when customers use creator promo codes. Pending conversions are kept out of revenue totals until confirmed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

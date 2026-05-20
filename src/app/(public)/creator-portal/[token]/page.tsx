import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPortalData } from "@/lib/actions/creator-portal";
import { ContentUploadForm } from "./content-upload-form";
import { ContentList } from "./content-list";
import { CheckCircle2, Package, FileText, Upload, Clock } from "lucide-react";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function CreatorPortalPage({ params }: Props) {
  const { token } = await params;
  const data = await getPortalData(token);

  if (!data) {
    notFound();
  }

  const { campaign, brand, creator, campaignCreator, contents } = data;

  const statusColors: Record<string, string> = {
    pending: "bg-secondary text-primary",
    in_review: "bg-secondary text-primary",
    approved: "bg-primary/10 text-primary",
    revision_requested: "bg-accent/30 text-primary",
    rejected: "bg-red-100 text-red-800",
    posted: "bg-secondary text-primary",
  };

  const steps = [
    {
      icon: Package,
      title: "Receive Product",
      description: "Product shipped to you",
      completed: !!campaignCreator.readyAt,
    },
    {
      icon: FileText,
      title: "Review Brief",
      description: "Check campaign requirements",
      completed: true,
    },
    {
      icon: Upload,
      title: "Upload Content",
      description: "Submit for approval",
      completed: contents.length > 0,
    },
    {
      icon: CheckCircle2,
      title: "Get Approved",
      description: "Ready to post",
      completed: contents.some((c) => c.status === "approved" || c.status === "posted"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-4xl py-6">
          <div className="flex items-center gap-4">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl font-bold">
                {brand.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold">{brand.name}</h1>
              <p className="text-sm text-muted-foreground">Creator Portal</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl py-8 space-y-8">
        {/* Welcome card */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {creator.name}! 👋</CardTitle>
            <CardDescription>
              Thanks for partnering with {brand.name}. Here&apos;s everything you need for the{" "}
              <span className="font-medium text-foreground">{campaign.name}</span> campaign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress steps */}
            <div className="grid grid-cols-4 gap-4">
              {steps.map((step, i) => (
                <div key={i} className="text-center">
                  <div
                    className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      step.completed ? "bg-green-100 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Campaign Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Campaign</p>
                <p>{campaign.name}</p>
              </div>
              {campaign.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{campaign.description}</p>
                </div>
              )}
              {campaignCreator.affiliateCode && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Your Promo Code</p>
                  <code className="text-lg font-bold bg-muted px-3 py-1 rounded">
                    {campaignCreator.affiliateCode}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deliverables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expected Content</p>
                <p>
                  {campaignCreator.deliverableCount || 1} piece
                  {(campaignCreator.deliverableCount || 1) > 1 ? "s" : ""} of content
                </p>
              </div>
              {campaign.endDate && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Campaign End Date</p>
                  <p>
                    {new Date(campaign.endDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={statusColors[campaignCreator.status] || ""}>
                  {campaignCreator.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Content
            </CardTitle>
            <CardDescription>
              Upload your content for review. Accepted formats: MP4, MOV, JPG, PNG
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ContentUploadForm token={token} />
          </CardContent>
        </Card>

        {/* Submitted Content */}
        {contents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Submissions ({contents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ContentList contents={contents} />
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-8">
          <p>Questions? Contact {brand.name} directly.</p>
          <p className="mt-1">
            Powered by <span className="font-medium">Creator OS</span>
          </p>
        </div>
      </div>
    </div>
  );
}

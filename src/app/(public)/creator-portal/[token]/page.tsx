import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPortalData } from "@/lib/actions/creator-portal";
import { ContentUploadForm } from "./content-upload-form";
import { ContentList } from "./content-list";
import { ShippingAddressForm } from "./shipping-address-form";
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

  const { campaign, brand, creator, campaignCreator, contents, shippingAddress } = data;

  const statusColors: Record<string, string> = {
    pending: "bg-[hsl(var(--loading-track))] text-primary",
    in_review: "bg-[hsl(var(--loading-track))] text-primary",
    approved: "bg-primary/10 text-primary",
    revision_requested: "bg-[hsl(var(--loading-track))] text-primary",
    rejected: "bg-red-100 text-red-800",
    posted: "bg-[hsl(var(--loading-track))] text-primary",
  };

  const hasShippingAddress = !!shippingAddress;
  const hasSubmittedContent = contents.length > 0;
  const hasApprovedContent = contents.some((c) => c.status === "approved" || c.status === "posted");
  const creatorNextStep = !hasShippingAddress
    ? {
        title: "Save Shipping Address",
        description: "Add your shipping address first so the brand can send campaign product.",
        href: "#shipping-address",
        actionLabel: "Save Address",
      }
    : !hasSubmittedContent
      ? {
          title: "Submit Content",
          description: "Submit your content for brand review when it is ready.",
          href: "#content-upload",
          actionLabel: "Submit Content",
        }
      : hasApprovedContent
        ? {
            title: "Post Approved Content",
            description: "Your content is approved. Post it, then share the live URL with the brand.",
            href: "#submitted-content",
            actionLabel: "View Status",
          }
        : {
            title: "Wait for Review",
            description: "Your content was submitted. The brand will approve it or request changes.",
            href: "#submitted-content",
            actionLabel: "View Status",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
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
                      step.completed ? "bg-green-100 text-primary" : "bg-card/70 text-muted-foreground"
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

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Next: {creatorNextStep.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{creatorNextStep.description}</p>
            </div>
            <a href={creatorNextStep.href} className="shrink-0">
              <Button size="sm">{creatorNextStep.actionLabel} →</Button>
            </a>
          </CardContent>
        </Card>

        <Card id="shipping-address">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shipping Address
            </CardTitle>
            <CardDescription>
              Add the address where {brand.name} should send campaign product. No login required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ShippingAddressForm token={token} address={shippingAddress} />
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
                  <code className="text-lg font-bold bg-card/70 border border-border px-3 py-1 rounded">
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
              <div>
                <p className="text-sm font-medium text-muted-foreground">Campaign End Date</p>
                <p>
                  {campaign.endDate
                    ? new Date(campaign.endDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Ongoing"}
                </p>
              </div>
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
        <Card id="content-upload">
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
          <Card id="submitted-content" className="bg-card/50">
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

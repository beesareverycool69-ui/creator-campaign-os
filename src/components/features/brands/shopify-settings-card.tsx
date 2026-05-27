import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateShopifyIntegrationSettings,
  type ShopifyIntegrationSettings,
} from "@/lib/actions/brands";

type ShopifySettingsCardProps = {
  brandId: string;
  integration: ShopifyIntegrationSettings;
};

export function ShopifySettingsCard({ brandId, integration }: ShopifySettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Shopify</CardTitle>
            <CardDescription>
              Store private beta Shopify credentials for future code creation and brand-safe webhooks.
            </CardDescription>
          </div>
          <ShopifyStatusBadge status={integration.status} />
        </div>
      </CardHeader>
      <CardContent>
        <form action={updateShopifyIntegrationSettings} className="space-y-4">
          <input type="hidden" name="brandId" value={brandId} />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="shopDomain">Shop domain</Label>
              <Input
                id="shopDomain"
                name="shopDomain"
                placeholder="your-store.myshopify.com"
                defaultValue={integration.shopDomain ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Accepts a full myshopify.com domain or store slug.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessToken">Admin API access token</Label>
              <Input
                id="accessToken"
                name="accessToken"
                type="password"
                placeholder={integration.hasAccessToken ? "Saved — leave blank to keep" : "shpat_..."}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {integration.hasAccessToken ? "Token saved. Enter a new one to replace it." : "Required to create discount codes later."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Webhook secret</Label>
              <Input
                id="webhookSecret"
                name="webhookSecret"
                type="password"
                placeholder={integration.hasWebhookSecret ? "Saved — leave blank to keep" : "Shopify webhook secret"}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {integration.hasWebhookSecret ? "Secret saved. Enter a new one to replace it." : "Required for brand-safe webhook verification later."}
              </p>
            </div>
          </div>

          {integration.status === "missing_credentials" && (
            <p className="text-sm text-amber-600">
              Shopify is partially configured. Add the missing domain, token, or webhook secret to mark it connected.
            </p>
          )}

          <Button type="submit" size="sm">
            Save Shopify Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ShopifyStatusBadge({ status }: { status: ShopifyIntegrationSettings["status"] }) {
  if (status === "connected") {
    return <Badge>Connected</Badge>;
  }

  if (status === "missing_credentials") {
    return <Badge variant="secondary">Missing credentials</Badge>;
  }

  return <Badge variant="outline">Not connected</Badge>;
}

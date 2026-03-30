import Link from "next/link";
import { notFound } from "next/navigation";
import { ShipmentForm, ShipmentDetail } from "@/components/features/shipments";
import { getCampaignCreatorById } from "@/lib/actions/campaign-creators";
import {
  getShipment,
  getCreatorAddresses,
  getBrandProducts,
} from "@/lib/actions/shipments";

type Props = {
  params: Promise<{ id: string; creatorId: string }>;
};

export default async function ShipmentPage({ params }: Props) {
  const { id: campaignId, creatorId } = await params;

  const campaignCreator = await getCampaignCreatorById(creatorId);

  if (!campaignCreator) {
    notFound();
  }

  const { campaign, brandCreator } = campaignCreator;
  const { creator } = brandCreator;

  const [shipment, addresses, products] = await Promise.all([
    getShipment(creatorId),
    getCreatorAddresses(creator.id),
    getBrandProducts(campaign.brand.id),
  ]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <Link href={`/campaigns/${campaignId}`} className="hover:text-foreground">
          {campaign.name}
        </Link>
        <span>/</span>
        <Link
          href={`/campaigns/${campaignId}/creators/${creatorId}`}
          className="hover:text-foreground"
        >
          {creator.name}
        </Link>
        <span>/</span>
        <span>Shipment</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Shipment</h1>
        <p className="text-muted-foreground mt-1">
          {creator.name} • {campaign.name}
        </p>
      </div>

      {/* Content */}
      {shipment ? (
        <ShipmentDetail shipment={shipment} />
      ) : (
        <ShipmentForm
          campaignCreatorId={creatorId}
          campaignId={campaignId}
          addresses={addresses}
          products={products}
        />
      )}
    </div>
  );
}

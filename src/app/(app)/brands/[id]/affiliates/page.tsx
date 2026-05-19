import { redirect } from "next/navigation";
import { getCampaigns } from "@/lib/actions/campaigns";
import { getBrandById } from "@/lib/actions/brands";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LegacyBrandWorkspaceRedirect({ params }: Props) {
  const { id } = await params;

  const [brand, campaigns] = await Promise.all([
    getBrandById(id),
    getCampaigns(id),
  ]);

  if (!brand) {
    redirect("/brands");
  }

  const firstCampaign = campaigns[0];
  redirect(firstCampaign ? `/campaigns/${firstCampaign.id}` : `/campaigns/new?brandId=${id}`);
}

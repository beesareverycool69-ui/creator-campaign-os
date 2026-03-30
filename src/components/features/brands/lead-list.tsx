"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { LeadRow } from "./lead-row";
import type { BrandCreatorWithDetails } from "@/lib/actions/brand-creators";

const FOLLOW_UP_OPTIONS = [3, 5, 7, 14] as const;

type Props = {
  brandCreators: BrandCreatorWithDetails[];
};

export function LeadList({ brandCreators }: Props) {
  const [followUpDays, setFollowUpDays] = useState(3);

  const contactedCount = brandCreators.filter((bc) => bc.status === "contacted").length;

  return (
    <div className="space-y-2">
      {/* Header row with follow-up threshold */}
      <div className="hidden md:flex items-center gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
        <div className="flex-1">Creator</div>
        <div className="w-32">Source</div>
        <div className="hidden lg:block w-32">Last Contact</div>
        {contactedCount > 0 && (
          <div className="flex items-center gap-2 mr-2 text-xs">
            <span className="text-orange-600">Follow-up after</span>
            <Select
              value={String(followUpDays)}
              onChange={(e) => setFollowUpDays(Number(e.target.value))}
              className="w-20 h-7 text-xs py-0"
            >
              {FOLLOW_UP_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}d</option>
              ))}
            </Select>
          </div>
        )}
        <div className="w-36">Status</div>
      </div>

      {brandCreators.map((bc) => (
        <LeadRow
          key={bc.id}
          brandCreator={bc}
          followUpDaysThreshold={followUpDays}
        />
      ))}
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { FileVideo, FileImage, Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";

interface Content {
  id: string;
  type: string;
  title: string | null;
  caption: string | null;
  fileUrls: string[] | null;
  status: string;
  createdAt: Date;
}

interface ContentListProps {
  contents: Content[];
}

const statusConfig = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  in_review: {
    label: "In Review",
    color: "bg-blue-100 text-blue-800",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle2,
  },
  revision_requested: {
    label: "Revision Requested",
    color: "bg-orange-100 text-orange-800",
    icon: AlertCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
  posted: {
    label: "Posted",
    color: "bg-purple-100 text-purple-800",
    icon: CheckCircle2,
  },
};

export function ContentList({ contents }: ContentListProps) {
  return (
    <div className="space-y-3">
      {contents.map((content) => {
        const status = statusConfig[content.status as keyof typeof statusConfig] || statusConfig.pending;
        const StatusIcon = status.icon;
        const isVideo = ["video", "reel", "short", "story"].includes(content.type);

        return (
          <div
            key={content.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                {isVideo ? (
                  <FileVideo className="h-6 w-6 text-blue-500" />
                ) : (
                  <FileImage className="h-6 w-6 text-green-500" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {content.title || `${content.type.charAt(0).toUpperCase() + content.type.slice(1)} Content`}
                </p>
                <p className="text-sm text-muted-foreground">
                  Submitted {new Date(content.createdAt).toLocaleDateString()}
                  {content.fileUrls && ` • ${content.fileUrls.length} file${content.fileUrls.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

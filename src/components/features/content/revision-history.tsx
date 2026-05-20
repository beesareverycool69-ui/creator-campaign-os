"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Revision = {
  id: string;
  feedback: string;
  fileUrls: string[] | null;
  requestedBy: string | null;
  createdAt: Date;
};

type RevisionHistoryProps = {
  revisions: Revision[];
};

export function RevisionHistory({ revisions }: RevisionHistoryProps) {
  if (revisions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Revision History ({revisions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {revisions.map((revision, index) => (
            <div
              key={revision.id}
              className="relative pl-6 pb-4 last:pb-0 border-l-2 border-muted last:border-transparent"
            >
              {/* Timeline dot */}
              <div className="absolute left-0 top-0 w-3 h-3 rounded-full bg-orange-500 -translate-x-[7px]" />
              
              <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    Revision #{revisions.length - index}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {new Date(revision.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Feedback */}
                <div className="bg-card/70 border border-border p-3 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{revision.feedback}</p>
                </div>

                {/* Attached files */}
                {revision.fileUrls && revision.fileUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {revision.fileUrls.map((url, fileIndex) => (
                      <a
                        key={fileIndex}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        📎 Attachment {fileIndex + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
